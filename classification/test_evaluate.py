import unittest
from evaluate import validate_dataset, passes, reusable_prediction
from runtime import POLICY


class EvaluationTests(unittest.TestCase):
    def test_only_complete_compatible_fully_labelled_prediction_windows_are_reused(self):
        identity = {'runtimeHash': 'current'}
        window = {key: {'choice': next(iter(question['criteria'])), 'probabilities': {label: 1 / len(question['criteria']) for label in question['criteria']}} for key, question in POLICY['questions'].items()}
        record = {'datasetHash': 'dataset', 'identity': identity, 'prediction': {'identity': {**identity, 'calibrationHash': 'uncalibrated'},
                  'complete': True, 'windows': 1, 'windowAnswers': [window]}}
        self.assertTrue(reusable_prediction(record, 'dataset', identity))
        choice = window['experience'].pop('choice')
        self.assertFalse(reusable_prediction(record, 'dataset', identity))
        window['experience']['choice'] = choice
        record['prediction']['complete'] = False
        self.assertFalse(reusable_prediction(record, 'dataset', identity))
        record['prediction']['complete'] = True
        window.pop('experience')
        self.assertFalse(reusable_prediction(record, 'dataset', identity))
        self.assertFalse(reusable_prediction(record, 'different-dataset', identity))
    def test_small_synthetic_dataset_cannot_enable_enforcement(self):
        with self.assertRaises(ValueError):
            validate_dataset([{'id': 'fixture', 'split': 'test', 'labelSource': 'synthetic', 'job': {'title': 'Intern'}}])

    def test_coverage_and_critical_errors_cannot_be_hidden_by_precision(self):
        metrics = {'employmentPrecision': 1, 'experiencePrecision': 1, 'internshipPrecision': 1, 'coverage': .1, 'managerToInternErrors': 0, 'targetAccuracy': 1, 'baselineTargetAccuracy': .5}
        self.assertFalse(passes(metrics))
        metrics.update(coverage=.9, managerToInternErrors=1)
        self.assertFalse(passes(metrics))
        metrics['managerToInternErrors'] = 0
        self.assertTrue(passes(metrics))


if __name__ == '__main__':
    unittest.main()
