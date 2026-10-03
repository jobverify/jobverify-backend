"""Human-labelled validation fits calibration; untouched test data decides release."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import time
from runtime import POLICY, MODEL, ROOT, Classifier, aggregate_answers, calibrated_answer, release_digest, load_agent, audit_question_budget
from training import validate_training_dataset, validate_canonical_inputs


def call_policy(action, rows):
    result = subprocess.run(['node', str(ROOT / 'evaluation_policy.js'), action], input=json.dumps(rows), text=True, encoding='utf-8', capture_output=True, check=True, cwd=ROOT.parent)
    return json.loads(result.stdout)


def reusable_prediction(record, dataset_hash, identity):
    prediction = record.get('prediction', {})
    windows = prediction.get('windowAnswers')
    if (record.get('datasetHash') != dataset_hash or record.get('identity') != identity
            or prediction.get('identity') != {**identity, 'calibrationHash': 'uncalibrated'}
            or prediction.get('complete') is not True or not isinstance(windows, list) or not windows
            or prediction.get('windows') != len(windows)):
        return False
    try:
        for window in windows:
            if set(window) != set(POLICY['questions']):
                return False
            for key, answer in window.items():
                if set(answer['probabilities']) != set(POLICY['questions'][key]['criteria']):
                    return False
                if answer.get('choice') not in answer['probabilities'] or answer['probabilities'][answer['choice']] < max(answer['probabilities'].values()) - .00001:
                    return False
                calibrated_answer(answer, 1)
    except (KeyError, TypeError, ValueError, AttributeError):
        return False
    return True


def validate_dataset(rows):
    splits = validate_training_dataset(rows, minimums={'train': 100 if any(row.get('split') == 'train' for row in rows) else 0,
                                                       'validation': 200, 'test': 300})
    validation, test = splits['validation'], splits['test']
    counts = {'validation': len(validation), 'test': len(test), 'testInternships': sum(row['expected']['employment'] == 'internship' for row in test), 'testLeadership': sum(row['expected']['seniority'] == 'leadership' for row in test)}
    if counts['validation'] < 200 or counts['test'] < 300 or counts['testInternships'] < 50 or counts['testLeadership'] < 50:
        raise ValueError('need >=200 validation, >=300 test, and >=50 test internships and leadership roles')
    if not any(row.get('targetCase') is True for row in validation) or not any(row.get('targetCase') is True for row in test):
        raise ValueError('mark graduation-cohort, manager, and trainee target cases in both splits')
    return counts


def fit_temperatures(rows):
    temperatures = {}
    for key in POLICY['questions']:
        samples = [(row['prediction']['answers'].get(key), row['expected'].get(key)) for row in rows]
        samples = [(answer, label) for answer, label in samples if answer and label in answer['probabilities']]
        if not samples:
            temperatures[key] = 1
            continue
        def loss(temperature):
            return sum(-math.log(max(1e-12, calibrated_answer(answer, temperature)['probabilities'][label])) for answer, label in samples) / len(samples)
        temperatures[key] = min([.5, .75, 1, 1.5, 2, 3, 5], key=loss)
    return temperatures


def predictions_for(rows, temperatures, thresholds):
    result = []
    for row in rows:
        windows = [{key: calibrated_answer(answer, temperatures.get(key, 1)) for key, answer in window.items()} for window in row['prediction'].get('windowAnswers', [])]
        prediction = {**row['prediction'], **aggregate_answers(windows, thresholds)}
        result.append({**row, 'prediction': prediction, 'thresholds': thresholds})
    return result


def metrics_for(rows, resolved):
    by_id = {row['id']: row for row in resolved}
    accepted = [row for row in rows if by_id[row['id']]['status'] == 'accepted']
    interns = [row for row in accepted if by_id[row['id']]['resolved']['jobType'] == 'Intern']
    targets = [row for row in rows if row.get('targetCase') is True]
    employment = {'Full-time': 'full_time', 'Internship': 'internship', 'Contract': 'contract', 'Other': 'other', None: 'unspecified'}
    return {
        'employmentPrecision': sum(employment.get(by_id[row['id']]['resolved']['employmentType']) == row['expected']['employment'] for row in accepted) / len(accepted) if accepted else 0,
        'experiencePrecision': sum(by_id[row['id']]['resolved']['experiencePolicy'] == row['expected']['experience'] for row in accepted) / len(accepted) if accepted else 0,
        'internshipPrecision': sum(row['expected']['employment'] == 'internship' for row in interns) / len(interns) if interns else 0,
        'coverage': len(accepted) / len(rows) if rows else 0,
        'managerToInternErrors': sum(row['expected']['seniority'] == 'leadership' and by_id[row['id']]['resolved']['jobType'] == 'Intern' for row in rows),
        'targetAccuracy': sum(by_id[row['id']]['resolved']['jobType'] == row['expected']['jobType'] for row in targets) / len(targets) if targets else 0,
        'baselineTargetAccuracy': sum(row['baselineJobType'] == row['expected']['jobType'] for row in targets) / len(targets) if targets else 1,
        'accepted': len(accepted), 'testRows': len(rows),
    }


def passes(metrics):
    return (metrics['employmentPrecision'] >= .95 and metrics['experiencePrecision'] >= .95 and metrics['internshipPrecision'] >= .98
            and metrics['coverage'] >= .70 and metrics['managerToInternErrors'] == 0 and metrics['targetAccuracy'] > metrics['baselineTargetAccuracy'])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('dataset', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'release.json')
    parser.add_argument('--predictions', type=Path, help='Optional raw prediction JSONL checkpoint; reuses completed ids only for this exact dataset and model identity.')
    args = parser.parse_args()
    dataset_bytes = args.dataset.read_bytes()
    dataset_hash = hashlib.sha256(dataset_bytes).hexdigest()
    rows = [json.loads(line) for line in dataset_bytes.decode('utf-8').splitlines() if line.strip()]
    counts = validate_dataset(rows)
    prepared = call_policy('prepare', rows)
    validate_canonical_inputs(prepared['rows'])
    rows = [row for row in prepared['rows'] if row['split'] != 'train']
    identity = prepared['identity']
    cached = {}
    if args.predictions and args.predictions.is_file():
        for line in args.predictions.read_text(encoding='utf-8').splitlines():
            record = json.loads(line)
            if reusable_prediction(record, dataset_hash, identity):
                cached[record['id']] = {**record['prediction'], **aggregate_answers(record['prediction']['windowAnswers'], POLICY['thresholds'])}
    import torch
    torch.set_num_threads(2)
    agent = load_agent()
    adapter = getattr(agent, 'job_head_manifest', None)
    if adapter and adapter['datasetHash'] != dataset_hash:
        raise ValueError('trained adapter evaluation must use the exact frozen full training/validation/test dataset')
    audit_question_budget(agent)
    worker = Classifier(agent, budget_seconds=86400)
    start = time.monotonic()
    for index, row in enumerate(rows):
        row['prediction'] = cached.get(row['id']) or worker.classify(row['input'], include_windows=True)
        if args.predictions and row['id'] not in cached:
            args.predictions.parent.mkdir(parents=True, exist_ok=True)
            with args.predictions.open('a', encoding='utf-8') as stream:
                stream.write(json.dumps({'id': row['id'], 'datasetHash': dataset_hash, 'identity': identity, 'prediction': row['prediction']}) + '\n')
        if (index + 1) % 25 == 0:
            print(json.dumps({'predicted': index + 1, 'total': len(rows)}), flush=True)
    validation = [row for row in rows if row['split'] == 'validation']
    test = [row for row in rows if row['split'] == 'test']
    temperatures = fit_temperatures(validation)
    candidates = []
    for threshold in [.90, .925, .95, .975, .99]:
        thresholds = {key: threshold for key in POLICY['questions']}
        calibrated = predictions_for(validation, temperatures, thresholds)
        metrics = metrics_for(validation, call_policy('resolve', calibrated)['rows'])
        candidates.append((passes(metrics), metrics['coverage'], thresholds, metrics))
    eligible = [candidate for candidate in candidates if candidate[0]]
    selected = max(eligible or candidates, key=lambda candidate: (candidate[0], candidate[1]))
    thresholds, validation_metrics = selected[2:]
    calibrated_test = predictions_for(test, temperatures, thresholds)
    test_metrics = metrics_for(test, call_policy('resolve', calibrated_test)['rows'])
    release = {'approved': bool(eligible) and passes(test_metrics), 'humanLabels': True, 'identity': identity, 'datasetHash': dataset_hash,
               'counts': counts, 'temperatures': temperatures, 'thresholds': thresholds, 'validationMetrics': validation_metrics,
               'testMetrics': test_metrics, 'elapsedSeconds': round(time.monotonic() - start, 2)}
    release['artifactHash'] = release_digest(release)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(release, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(release, indent=2))
    if not release['approved']:
        raise SystemExit('Evaluation failed; remain in shadow mode. Do not retune on the test split.')


if __name__ == '__main__':
    main()
