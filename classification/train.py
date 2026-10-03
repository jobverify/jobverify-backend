"""Supervised job-domain training of Laya's decision head; encoder weights stay frozen."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import time
from evaluate import call_policy
from runtime import MODEL, POLICY, POLICY_HASH, ROOT, audit_question_budget, source_windows
from training import validate_training_dataset, validate_canonical_inputs, load_head_adapter


def training_items(agent, rows, shuffle_options=False):
    from laya.common import build_sequence, QTYPES
    items = []
    for row in rows:
        states, reason = source_windows(agent, row['input'])
        if reason or row['input']['incomplete']:
            raise ValueError('training source cannot be fully inspected: ' + row['id'])
        for state in states:
            for key, question in POLICY['questions'].items():
                internal = agent._to_internal(question)
                order = list(range(len(question['criteria'])))
                if shuffle_options:
                    random.shuffle(order)
                ids, markers, truncation = build_sequence(agent.tok, state, internal, agent.cfg['max_len'], agent.cfg['head_max_len'],
                                                          option_order=order, return_truncation_stats=True)
                if truncation['state_tokens_dropped']:
                    raise ValueError('training source was truncated')
                items.append({'ids': ids, 'markers': markers, 'type': QTYPES[question['type']],
                              'target': order.index(list(question['criteria']).index(row['expected'][key]))})
    return items


def batch(item, device):
    import torch
    return {'input_ids': torch.tensor([item['ids']], device=device),
            'attention_mask': torch.ones((1, len(item['ids'])), dtype=torch.long, device=device),
            'marker_pos': torch.tensor([item['markers']], device=device),
            'marker_mask': torch.ones((1, len(item['markers'])), dtype=torch.bool, device=device),
            'qtype': torch.tensor([item['type']], device=device)}


def smoke_rows():
    # These fixtures test gradients and serialization. They never stand in for human labels or a release.
    return [{'id': 'synthetic-smoke', 'referenceDate': '2026-10-03T12:00:00Z',
             'job': {'title': 'Graduate Engineer', 'description': 'Permanent full-time job. Freshers can apply.',
                     'sourceEmploymentType': 'Full Time', 'sourceExperienceRequired': '0'},
             'expected': {'employment': 'full_time', 'experience': 'fresher_eligible', 'seniority': 'entry', 'leadership': 'unknown'}}]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', nargs='?', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--epochs', type=int, default=3)
    parser.add_argument('--learning-rate', type=float, default=3e-5)
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--budget-seconds', type=int, default=3600)
    parser.add_argument('--seed', type=int, default=1337)
    parser.add_argument('--smoke', action='store_true', help='Synthetic optimizer/serialization check only. Its adapter cannot be activated.')
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('refusing to overwrite a previous trained artifact')
    if not args.output.resolve().is_relative_to(ROOT.parent.resolve()):
        raise ValueError('--output must be within this repository, such as .cache/classification/job-head')
    if not 1 <= args.epochs <= 20 or not 0 < args.learning_rate <= .001 or args.budget_seconds <= 0:
        raise ValueError('invalid training limits')
    if args.smoke:
        rows, dataset_bytes = smoke_rows(), b'synthetic optimizer smoke'
        splits = {'train': rows, 'validation': [], 'test': []}
    else:
        if not args.dataset:
            raise ValueError('a human-labelled dataset is required')
        dataset_bytes = args.dataset.read_bytes()
        rows = [json.loads(line) for line in dataset_bytes.decode('utf-8').splitlines() if line.strip()]
        splits = validate_training_dataset(rows)
    # Preparing source text never uses the supplied labels or existing inferred fields as model input.
    prepared = call_policy('prepare', rows)['rows']
    validate_canonical_inputs(prepared)
    train_rows = [row for row in prepared if args.smoke or row['split'] == 'train']
    validation_rows = [] if args.smoke else [row for row in prepared if row['split'] == 'validation']
    import torch
    from laya import Agent
    from safetensors.torch import save_file
    torch.set_num_threads(2)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    if args.device == 'cuda' and not torch.cuda.is_available():
        raise ValueError('CUDA requested but no GPU is available')
    agent = Agent(MODEL['modelId'], subfolder=MODEL['subfolder'], revision=MODEL['revision'], device=args.device, fast=False, compile=False)
    audit_question_budget(agent)
    model = agent.model
    for name, parameter in model.named_parameters():
        parameter.requires_grad_(not name.startswith(('encoder.', 'act_head.')))
    trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
    optimizer = torch.optim.AdamW(trainable, lr=args.learning_rate, weight_decay=.01)
    train = training_items(agent, train_rows, shuffle_options=True)
    validation = training_items(agent, validation_rows)
    first_parameter = trainable[0]
    before = first_parameter.detach().clone() if args.smoke else None
    encoder_probe = next(model.encoder.parameters()).detach().flatten()[:100].clone()
    deadline, best_loss, best_state, history = time.monotonic() + args.budget_seconds, float('inf'), None, []
    for epoch in range(1 if args.smoke else args.epochs):
        random.shuffle(train)
        model.train()
        model.encoder.eval()
        total = 0
        for index, item in enumerate(train):
            if time.monotonic() >= deadline:
                raise ValueError('training budget exhausted; no completed candidate was published')
            optimizer.zero_grad(set_to_none=True)
            logits, _ = model(**batch(item, args.device), detach_encoder=True)
            loss = torch.nn.functional.cross_entropy(logits, torch.tensor([item['target']], device=args.device))
            if not torch.isfinite(loss):
                raise ValueError('non-finite training loss')
            loss.backward()
            torch.nn.utils.clip_grad_norm_(trainable, 1)
            optimizer.step()
            total += loss.item()
            if (index + 1) % 25 == 0:
                print(json.dumps({'epoch': epoch + 1, 'step': index + 1, 'totalSteps': len(train)}), flush=True)
        model.eval()
        validation_loss = 0
        with torch.no_grad():
            for item in validation:
                if time.monotonic() >= deadline:
                    raise ValueError('validation budget exhausted')
                logits, _ = model(**batch(item, args.device))
                validation_loss += torch.nn.functional.cross_entropy(logits, torch.tensor([item['target']], device=args.device)).item()
        validation_loss = validation_loss / len(validation) if validation else total / len(train)
        history.append({'epoch': epoch + 1, 'trainingLoss': total / len(train), 'validationLoss': validation_loss})
        if validation_loss < best_loss:
            best_loss = validation_loss
            best_state = {key: tensor.detach().cpu().contiguous().clone() for key, tensor in model.state_dict().items() if not key.startswith('encoder.')}
        print(json.dumps(history[-1]), flush=True)
    if not torch.equal(encoder_probe, next(model.encoder.parameters()).detach().flatten()[:100]) or any(p.grad is not None for p in model.encoder.parameters()):
        raise ValueError('encoder was unexpectedly trained')
    if args.smoke and torch.equal(before, first_parameter.detach()):
        raise ValueError('optimizer smoke did not update the head')
    args.output.mkdir(parents=True)
    weights_path = args.output / 'head.safetensors'
    save_file(best_state, str(weights_path))
    weights_hash = hashlib.sha256(weights_path.read_bytes()).hexdigest()
    manifest = {'format': 'jobverify-laya-head-v1', 'baseRevision': MODEL['revision'], 'subfolder': MODEL['subfolder'], 'policyHash': POLICY_HASH,
                'weightsHash': weights_hash, 'datasetHash': hashlib.sha256(dataset_bytes).hexdigest(), 'labelSource': 'synthetic' if args.smoke else 'human',
                'smokeOnly': args.smoke, 'counts': {split: len(values) for split, values in splits.items()}, 'seed': args.seed,
                'trainableParameters': sum(parameter.numel() for parameter in trainable), 'encoderFrozen': True, 'history': history,
                'testUsedForTraining': False, 'approved': False}
    manifest_bytes = (json.dumps(manifest, indent=2) + '\n').encode()
    (args.output / 'manifest.json').write_bytes(manifest_bytes)
    pin = {'directory': str(args.output.resolve().relative_to(ROOT.parent.resolve())).replace('\\', '/'),
           'manifestHash': hashlib.sha256(manifest_bytes).hexdigest(), 'weightsHash': weights_hash}
    # Verify serialization against the trained tensors using the same loader as the actual worker.
    load_head_adapter(agent, pin, allow_smoke=args.smoke)
    if any(not torch.equal(agent.model.state_dict()[key].cpu(), value) for key, value in best_state.items()):
        raise ValueError('saved adapter failed round-trip verification')
    print(json.dumps({'output': str(args.output), 'bytes': weights_path.stat().st_size, 'headAdapter': pin,
                      'smokeOnly': args.smoke, 'encoderFrozen': True, 'serializationVerified': True, 'releaseApproved': False}), flush=True)


if __name__ == '__main__':
    main()
