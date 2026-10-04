import unittest
import threading
import time
import io
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch
from runtime import Classifier, aggregate_answers, calibrated_answer, load_release, POLICY, audit_question_budget, source_context, serve
import runtime


class Tokenizer:
    mask_token = '[MASK]'
    def encode(self, text, add_special_tokens=False):
        return text.split()
    def decode(self, tokens, **kwargs):
        return ' '.join(tokens)


def answer(key, choice, probability=.99):
    labels = list(POLICY['questions'][key]['criteria'])
    return {'choice': choice, 'probabilities': {label: probability if label == choice else (1 - probability) / (len(labels) - 1) for label in labels}}


class FakeAgent:
    tok = Tokenizer()
    cfg = {'max_len': 160, 'head_max_len': 30}
    def __init__(self):
        self.states = []
    def _to_internal(self, question):
        return question
    def predict(self, state, questions, **kwargs):
        self.states.append(state)
        choices = {'employment': 'full_time', 'experience': 'prior_required', 'seniority': 'leadership', 'leadership': 'manager'}
        return {'answers': {key: answer(key, choices[key]) for key in questions}, 'usage': {'state_tokens_dropped': 0}}


class RuntimeTests(unittest.TestCase):
    def test_requested_eight_cpu_threads_are_applied_before_model_loading(self):
        applied = []
        torch = SimpleNamespace(set_num_threads=applied.append)
        with patch.dict(os.environ, {'LAYA_CPU_THREADS': '8'}), patch.dict(sys.modules, {'torch': torch}), \
                patch('runtime.argparse.ArgumentParser.parse_args', return_value=SimpleNamespace(port=8765)), \
                patch('runtime.load_release', return_value=None), patch('runtime.load_agent', side_effect=RuntimeError('probe stops before loading')):
            with self.assertRaisesRegex(RuntimeError, 'probe stops'):
                runtime.main()
        self.assertEqual(applied, [8])

    def test_only_employer_batches_enter_source_context(self):
        request = {'title': 'Engineer', 'eligibleBatches': [2025], 'referenceYear': 2026}
        self.assertNotIn('Eligible graduation batches', source_context(request))
        self.assertIn('Eligible graduation batches: [2025]', source_context({**request, 'eligibleBatchesProvenance': 'source'}))

    def test_missing_question_in_any_window_cannot_make_a_complete_decision(self):
        agent = FakeAgent()
        predict = agent.predict
        def partial_predict(*args):
            result = predict(*args)
            if len(agent.states) > 1:
                result['answers'].pop('experience')
            return result
        agent.predict = partial_predict
        worker = Classifier(agent, room=lambda *args: 130)
        with self.assertRaisesRegex(ValueError, 'missing questions'):
            worker.classify({'title': 'Engineer', 'body': ' '.join(['work'] * 420), 'referenceYear': 2026})

    def test_zero_to_one_range_allows_freshers_but_graduation_alone_has_no_numeric_minimum(self):
        context = source_context({'title': 'Intern', 'sourceExperienceRequired': '0-1'})
        self.assertIn('Minimum required professional experience: 0 years.', context)
        self.assertIn('permits applicants without prior professional experience', context)
        self.assertNotIn('Minimum required professional experience', source_context({'title': 'Graduate', 'eligibleBatches': [2025], 'referenceYear': 2026}))
    def test_question_audit_rejects_lost_instructions_and_indistinguishable_options(self):
        agent = FakeAgent()
        agent.tok.cls_token_id, agent.tok.sep_token_id = '[CLS]', '[SEP]'
        def build_head(tok, q, budget):
            instructions = tok.encode('choice question: ' + q['instructions'])
            if budget == 30:
                instructions = instructions[:3]
            return ['[CLS]', *instructions, '[SEP]'], [], {'options_distinct': len(q['criteria']), 'options': len(q['criteria'])}
        def options(q):
            return list(q['criteria'])
        with self.assertRaisesRegex(ValueError, 'instructions'):
            audit_question_budget(agent, build_head=build_head, render_options=options)

    def test_required_source_experience_reaches_every_window(self):
        agent = FakeAgent()
        worker = Classifier(agent, room=lambda *args: 130)
        result = worker.classify({'title': 'Network Administrator', 'body': ' '.join('token%d' % i for i in range(420)),
                                 'sourceEmploymentType': 'Full Time', 'sourceExperienceRequired': '3-5', 'referenceYear': 2026})
        self.assertTrue(result['complete'])
        self.assertGreater(result['windows'], 1)
        self.assertTrue(all('Required professional experience (employer field): 3-5' in state for state in agent.states))

    def test_numeric_zero_source_experience_is_preserved(self):
        agent = FakeAgent()
        worker = Classifier(agent, room=lambda *args: 130)
        worker.classify({'title': 'Graduate Engineer', 'body': 'Build software.', 'sourceExperienceRequired': 0, 'referenceYear': 2026})
        self.assertIn('Required professional experience (employer field): 0', agent.states[0])

    def test_forward_finishing_after_deadline_is_incomplete(self):
        agent = FakeAgent()
        worker = Classifier(agent, room=lambda *args: 130)
        clock = [10]
        predict = agent.predict
        def slow_predict(*args):
            clock[0] = 12
            return predict(*args)
        agent.predict = slow_predict
        with patch('runtime.time.monotonic', side_effect=lambda: clock[0]):
            result = worker.classify({'title': 'Engineer', 'body': 'Build software.', 'referenceYear': 2026}, deadline=11)
        self.assertFalse(result['complete'])
        self.assertEqual(result.get('reason'), 'request_deadline')

    def test_busy_worker_is_rejected_before_waiting_for_the_previous_forward(self):
        worker = Classifier(FakeAgent(), room=lambda *args: 130)
        worker.lock.acquire()
        release = threading.Timer(.25, worker.lock.release)
        release.start()
        try:
            status, result = worker.handle({'title': 'Engineer', 'body': 'Build software.', 'referenceYear': 2026, 'identity': worker.identity})
            self.assertEqual(status, 503)
            self.assertEqual(result, {'error': 'busy'})
        finally:
            release.join()

    def test_windows_client_disconnect_is_not_an_inference_failure(self):
        worker = Classifier(FakeAgent(), room=lambda *args: 130)
        class DisconnectedWriter(io.BytesIO):
            def write(self, value):
                raise ConnectionAbortedError('WinError 10053')
        with patch('runtime.ThreadingHTTPServer') as server:
            serve(worker, 8765)
            handler_type = server.call_args[0][1]
            handler = object.__new__(handler_type)
            handler.request_version = 'HTTP/1.1'
            handler.requestline = 'POST /classify HTTP/1.1'
            handler.command = 'POST'
            handler.wfile = DisconnectedWriter()
            handler.respond(200, {'complete': False})
        self.assertEqual(worker.stats['errors'], 0)

    def test_every_token_is_scanned_and_title_is_repeated(self):
        agent = FakeAgent()
        worker = Classifier(agent, room=lambda *args: 130)
        result = worker.classify({'title': 'Engineering Manager', 'body': ' '.join('token%d' % i for i in range(420)), 'referenceYear': 2026})
        self.assertTrue(result['complete'])
        self.assertGreater(result['windows'], 1)
        for i in range(420):
            self.assertTrue(any('token%d ' % i in state + ' ' for state in agent.states))
        self.assertTrue(all('Engineering Manager' in state for state in agent.states))

    def test_conflicting_high_confidence_windows_abstain(self):
        result = aggregate_answers([{'employment': answer('employment', 'full_time')}, {'employment': answer('employment', 'internship')}], POLICY['thresholds'])
        self.assertIn('employment', result['conflicts'])

    def test_entropy_confidence_is_not_used(self):
        value = answer('employment', 'full_time', .51)
        value['confidence'] = .999
        self.assertEqual(calibrated_answer(value, 1)['answer_confidence'], .51)

    def test_release_is_disabled_without_human_evaluation(self):
        self.assertIsNone(load_release(None))

    def test_explicit_request_deadline_marks_uninspected_document_incomplete(self):
        agent = FakeAgent()
        worker = Classifier(agent, room=lambda *args: 130)
        result = worker.classify({'title': 'Manager', 'body': ' '.join(['work'] * 420), 'referenceYear': 2026}, deadline=time.monotonic() - 1)
        self.assertFalse(result['complete'])
        self.assertEqual(agent.states, [])

    def test_worker_still_scans_new_jobs_after_twenty_minutes(self):
        with patch('runtime.time.monotonic', return_value=10):
            worker = Classifier(FakeAgent(), room=lambda *args: 130)
        with patch('runtime.time.monotonic', return_value=2000):
            status, result = worker.handle({'title': 'Engineer', 'body': 'Build software.', 'referenceYear': 2026, 'identity': worker.identity})
        self.assertEqual(status, 200)
        self.assertTrue(result['complete'])

    def test_full_description_scan_can_take_longer_than_sixty_seconds(self):
        agent = FakeAgent()
        clock = [10]
        predict = agent.predict
        def slow_predict(*args):
            clock[0] += 70
            return predict(*args)
        agent.predict = slow_predict
        worker = Classifier(agent, room=lambda *args: 130)
        with patch('runtime.time.monotonic', side_effect=lambda: clock[0]):
            status, result = worker.handle({'title': 'Engineer', 'body': ' '.join(['work'] * 420), 'referenceYear': 2026, 'identity': worker.identity})
        self.assertEqual(status, 200)
        self.assertTrue(result['complete'])
        self.assertGreater(result['windows'], 1)


if __name__ == '__main__':
    unittest.main()
