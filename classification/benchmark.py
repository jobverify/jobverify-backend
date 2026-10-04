"""Replay captured source jobs locally. This diagnostic cannot approve a release."""
import argparse
import json
from pathlib import Path
import time
from evaluate import call_policy
from runtime import Classifier, MODEL, audit_question_budget


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--jobs', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--reference-date', required=True)
    args = parser.parse_args()
    jobs = json.loads(args.jobs.read_text(encoding='utf-8'))
    if not isinstance(jobs, list) or not jobs:
        raise ValueError('--jobs must contain a nonempty JSON array of source jobs')
    if args.output.exists():
        raise ValueError('refusing to overwrite a previous comparison')
    prepared = call_policy('prepare', [{'id': str(i), 'job': job, 'referenceDate': args.reference_date} for i, job in enumerate(jobs)])
    import torch
    from runtime import load_agent
    torch.set_num_threads(2)
    agent = load_agent()
    worker = Classifier(agent)
    report = {'kind': 'diagnostic, not a release', 'identity': worker.identity, 'referenceDate': args.reference_date,
              'questionBudget': audit_question_budget(agent), 'requestSeconds': MODEL['requestSeconds'], 'results': []}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    for row in prepared['rows']:
        start = time.monotonic()
        prediction = worker.classify(row['input'], include_windows=True)
        resolved = call_policy('resolve', [{**row, 'prediction': prediction}])['rows'][0]
        result = {'title': row['job']['title'], 'baselineJobType': row['baselineJobType'],
                  'elapsedSeconds': round(time.monotonic() - start, 2), 'prediction': prediction, **resolved}
        report['results'].append(result)
        args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        print(json.dumps({'title': result['title'], 'seconds': result['elapsedSeconds'], 'status': result['status'],
                          'choices': {key: answer['choice'] for key, answer in prediction.get('answers', {}).items()}}), flush=True)


if __name__ == '__main__':
    main()
