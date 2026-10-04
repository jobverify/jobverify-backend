import unittest
from training import validate_training_dataset, validate_adapter_manifest, validate_canonical_inputs
from runtime import MODEL, POLICY_HASH


def row(index, split='train'):
    return {'id': str(index), 'companyKey': 'company-%s' % index, 'split': split, 'labelSource': 'human', 'labelledBy': 'reviewer', 'referenceDate': '2026-10-03T12:00:00Z',
            'job': {'title': 'Engineer %s' % index, 'description': 'Full-time role. Required: %s years experience.' % index},
            'expected': {'employment': 'full_time', 'experience': 'prior_required', 'seniority': 'mid', 'leadership': 'unknown', 'jobType': 'Full-time Experienced'}}


class TrainingTests(unittest.TestCase):
    def test_html_variants_cannot_leak_the_same_model_text_across_splits(self):
        from evaluate import call_policy
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        rows[0]['job'] = {'title': 'Engineer', 'description': '<p>Full-time job. 3 years experience required.</p>'}
        rows[2]['job'] = {'title': 'Engineer', 'description': '<div>Full-time job. 3 years experience required.</div>'}
        self.validate(rows)  # raw HTML differs
        prepared = call_policy('prepare', rows)['rows']
        with self.assertRaisesRegex(ValueError, 'canonical'):
            validate_canonical_inputs(prepared)

    def test_missing_company_and_shared_employer_are_rejected(self):
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        rows[2]['companyKey'] = rows[0]['companyKey']
        with self.assertRaisesRegex(ValueError, 'employer'):
            self.validate(rows)
        rows[2].pop('companyKey')
        with self.assertRaisesRegex(ValueError, 'companyKey'):
            self.validate(rows)
    def validate(self, rows):
        return validate_training_dataset(rows, minimums={'train': 1, 'validation': 1, 'test': 1})

    def test_training_validation_and_test_are_disjoint(self):
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        self.assertEqual(len(self.validate(rows)['train']), 1)
        rows[2]['job'] = {**rows[0]['job'], 'description': '  ' + rows[0]['job']['description'].upper() + '  '}
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            self.validate(rows)

    def test_one_posting_cannot_appear_in_two_splits_with_changed_content(self):
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        rows[0]['job']['jobUrl'] = rows[2]['job']['jobUrl'] = 'https://example.com/jobs/42'
        with self.assertRaisesRegex(ValueError, 'posting'):
            self.validate(rows)

    def test_predictions_and_missing_leadership_labels_are_not_training_truth(self):
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        rows[0]['labelSource'] = 'model'
        with self.assertRaisesRegex(ValueError, 'human'):
            self.validate(rows)
        rows[0]['labelSource'] = 'human'
        rows[0]['expected'].pop('leadership')
        with self.assertRaisesRegex(ValueError, 'leadership'):
            self.validate(rows)

    def test_conflicting_job_type_and_head_labels_are_rejected(self):
        rows = [row(1), row(2, 'validation'), row(3, 'test')]
        rows[0]['expected']['jobType'] = 'Intern'
        with self.assertRaisesRegex(ValueError, 'jobType'):
            self.validate(rows)

    def test_small_dataset_cannot_start_real_training(self):
        with self.assertRaisesRegex(ValueError, 'train'):
            validate_training_dataset([row(1), row(2, 'validation'), row(3, 'test')])

    def test_adapter_is_bound_to_checkpoint_questions_and_weights(self):
        digest = 'a' * 64
        manifest = {'baseRevision': MODEL['revision'], 'subfolder': MODEL['subfolder'], 'policyHash': POLICY_HASH,
                    'weightsHash': digest, 'smokeOnly': False, 'labelSource': 'human'}
        validate_adapter_manifest(manifest, digest)
        for changed in [{'weightsHash': 'b' * 64}, {'policyHash': 'old'}, {'baseRevision': 'old'}, {'smokeOnly': True}]:
            with self.assertRaises(ValueError):
                validate_adapter_manifest({**manifest, **changed}, digest)


if __name__ == '__main__':
    unittest.main()
