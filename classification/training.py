"""Dataset and artifact checks shared by training, evaluation and worker loading."""
import hashlib
import json
import re
from runtime import MODEL, POLICY, POLICY_HASH, ROOT


def content_fingerprint(row):
    job = row['job']
    description = job.get('sourceDescription', job.get('description') or job.get('jobDescription', ''))
    fields = [job.get('title', ''), description, *[job.get(key, '') for key in
              ['minimumQualification', 'preferredQualification', 'qualifications', 'responsibilities', 'requirements', 'sourceEmploymentType', 'sourceExperienceRequired']]]
    normalized = [re.sub(r'\s+', ' ', str(value if value is not None else '')).strip().casefold() for value in fields]
    return hashlib.sha256(json.dumps(normalized, ensure_ascii=False).encode()).hexdigest()


def validate_training_dataset(rows, minimums=None):
    minimums = minimums or {'train': 100, 'validation': 20, 'test': 20}
    splits = {key: [] for key in ['train', 'validation', 'test']}
    ids, fingerprints, postings, companies = set(), set(), {}, {}
    for row in rows:
        if not row.get('id') or row['id'] in ids:
            raise ValueError('unique nonempty job ids are required')
        ids.add(row['id'])
        if row.get('labelSource') != 'human' or not str(row.get('labelledBy') or '').strip():
            raise ValueError('human annotations and labelledBy are required; model predictions are not labels')
        if row.get('split') not in splits or not row.get('referenceDate') or not row.get('job', {}).get('title'):
            raise ValueError('source title, referenceDate and train/validation/test split are required')
        if not isinstance(row.get('companyKey'), str) or not row['companyKey'].strip():
            raise ValueError('companyKey is required to keep employers in disjoint splits')
        fingerprint = content_fingerprint(row)
        if fingerprint in fingerprints:
            raise ValueError('duplicate source text, including across dataset splits')
        fingerprints.add(fingerprint)
        posting = row['job'].get('jobUrl') or row['job'].get('applyLink')
        if posting and posting in postings and postings[posting] != row['split']:
            raise ValueError('one posting cannot appear in different splits')
        if posting:
            postings[posting] = row['split']
        company = row.get('companyKey')
        if company and company in companies and companies[company] != row['split']:
            raise ValueError('one employer cannot appear in different splits')
        if company:
            companies[company] = row['split']
        expected = row.get('expected', {})
        for key, question in POLICY['questions'].items():
            if expected.get(key) not in question['criteria']:
                raise ValueError('invalid or missing expected ' + key)
        employment, experience = expected['employment'], expected['experience']
        job_type = {'internship': 'Intern', 'contract': 'Contract', 'other': 'Others', 'unspecified': 'Unspecified'}.get(employment)
        if employment == 'full_time':
            job_type = 'Full-time Experienced' if experience == 'prior_required' else 'Full-time Fresher' if experience in ['fresher_eligible', 'mixed'] else 'Unspecified'
        if expected.get('jobType') != job_type:
            raise ValueError('expected.jobType conflicts with employment/experience labels')
        if expected['seniority'] == 'leadership' and expected['leadership'] == 'unknown':
            raise ValueError('leadership roles need an explicit leadership level')
        if expected['seniority'] != 'leadership' and expected['leadership'] != 'unknown':
            raise ValueError('non-leadership roles must use unknown leadership')
        splits[row['split']].append(row)
    for split, minimum in minimums.items():
        if len(splits[split]) < minimum:
            raise ValueError('need at least %s %s jobs' % (minimum, split))
    return splits


def validate_adapter_manifest(manifest, weights_hash, allow_smoke=False):
    if (manifest.get('baseRevision') != MODEL['revision'] or manifest.get('subfolder') != MODEL['subfolder']
            or manifest.get('policyHash') != POLICY_HASH or manifest.get('weightsHash') != weights_hash
            or (not allow_smoke and (manifest.get('smokeOnly') is not False or manifest.get('labelSource') != 'human'))):
        raise ValueError('head adapter is incompatible, altered, or only a synthetic smoke artifact')


def validate_canonical_inputs(rows):
    fingerprints = set()
    for row in rows:
        value = row['input']
        core = {key: value.get(key) for key in ['title', 'body', 'sourceEmploymentType', 'sourceExperienceRequired']}
        core = {key: re.sub(r'\s+', ' ', str(text or '')).strip().casefold() for key, text in core.items()}
        fingerprint = hashlib.sha256(json.dumps(core, sort_keys=True).encode()).hexdigest()
        if fingerprint in fingerprints:
            raise ValueError('duplicate canonical model input across dataset jobs')
        fingerprints.add(fingerprint)


def load_head_adapter(agent, pin, allow_smoke=False):
    if any(not re.fullmatch(r'[a-f0-9]{64}', pin.get(key, '')) for key in ['manifestHash', 'weightsHash']):
        raise ValueError('head adapter requires valid pinned manifest and weights digests')
    if pin.get('repoId'):
        if not re.fullmatch(r'[a-f0-9]{40}', pin.get('revision', '')):
            raise ValueError('remote head adapter requires an immutable Hub commit revision')
        from huggingface_hub import snapshot_download
        directory = ROOT.parent / '.cache/laya-model/job-heads' / pin['weightsHash']
        snapshot_download(pin['repoId'], revision=pin['revision'], allow_patterns=['manifest.json', 'head.safetensors'], local_dir=str(directory))
    else:
        directory = (ROOT.parent / pin['directory']).resolve()
        if not directory.is_relative_to(ROOT.parent.resolve()):
            raise ValueError('adapter directory must be within this repository')
    manifest_bytes = (directory / 'manifest.json').read_bytes()
    if hashlib.sha256(manifest_bytes).hexdigest() != pin['manifestHash']:
        raise ValueError('adapter manifest digest mismatch')
    manifest = json.loads(manifest_bytes)
    weights_path = directory / 'head.safetensors'
    weights_hash = hashlib.sha256(weights_path.read_bytes()).hexdigest()
    if weights_hash != pin['weightsHash']:
        raise ValueError('adapter weights digest mismatch')
    validate_adapter_manifest(manifest, weights_hash, allow_smoke=allow_smoke)
    from safetensors.torch import load_file
    import torch
    weights = load_file(str(weights_path))
    expected = {key: value for key, value in agent.model.state_dict().items() if not key.startswith('encoder.')}
    if set(weights) != set(expected) or any(weights[key].shape != expected[key].shape or not torch.isfinite(weights[key]).all() for key in expected):
        raise ValueError('head adapter must contain every compatible head tensor and no encoder tensors')
    agent.model.load_state_dict(weights, strict=False)
    agent.model.eval()
    agent.job_head_manifest = manifest
    return manifest
