import json
import hashlib
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from datetime import datetime, timezone
from pathlib import Path

import psutil
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from recoverTrialTitleFailures import recover


class TitleRecoverySupervisorTest(unittest.TestCase):
    def test_technical_resume_rejects_an_unverified_watchdog_exit(self):
        workspace = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            scripts = root / 'jobverify-backend/scripts'
            scripts.mkdir(parents=True)
            shutil.copy2(workspace / 'jobverify-backend/scripts/localTrialResourceGuard.py', scripts)
            directory = root / 'artifacts/trial'
            directory.mkdir(parents=True)
            helper = directory / 'resume-approved-one-thread.py'
            shutil.copy2(workspace / 'artifacts/full-gliclass-c10-2026-10-10-direct/resume-approved-one-thread.py', helper)
            approval = {'approvedAnswer': 'Resume on one CPU thread', 'cpuThreads': 1, 'ownerPid': 999999, 'ownerCreated': 2.0}
            (directory / 'approved-resume.json').write_text(json.dumps(approval))
            for guard_state in [
                {'ownerPid': 999999, 'ownerCreated': 2.0, 'status': 'monitoring'},
                {'ownerPid': 999999, 'ownerCreated': 3.0, 'status': 'owner_exited'},
            ]:
                with self.subTest(guard_state=guard_state):
                    (directory / 'resource-guard.json').write_text(json.dumps(guard_state))
                    result = subprocess.run([sys.executable, str(helper)], capture_output=True, text=True, timeout=10)
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('unknown stop cannot be retried', result.stderr)
                    self.assertFalse((directory / 'run-state.json').exists())
                    self.assertEqual(json.loads((directory / 'approved-resume.json').read_text()), approval)

    def test_a_fresh_user_approval_is_bound_to_the_exact_stopped_watchdog_record(self):
        workspace = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            scripts = root / 'jobverify-backend/scripts'
            scripts.mkdir(parents=True)
            shutil.copy2(workspace / 'jobverify-backend/scripts/localTrialResourceGuard.py', scripts)
            directory = root / 'artifacts/trial'
            directory.mkdir(parents=True)
            helper = directory / 'resume-approved-one-thread.py'
            shutil.copy2(workspace / 'artifacts/full-gliclass-c10-2026-10-10-direct/resume-approved-one-thread.py', helper)
            guard_state = {'ownerPid': 999999, 'ownerCreated': 2.0, 'status': 'stopped_resource_limit',
                           'finishedAt': '2026-10-11T08:53:47+00:00'}
            guard_file = directory / 'resource-guard.json'
            guard_file.write_text(json.dumps(guard_state))
            fresh = {'approvedAnswer': 'Resume the corrected trial', 'recordedAt': '2026-10-11T09:01:00+00:00',
                     'guardSnapshotSha256': hashlib.sha256(guard_file.read_bytes()).hexdigest()}
            for valid, acknowledgement in [
                (True, fresh),
                (False, {**fresh, 'guardSnapshotSha256': 'wrong'}),
                (False, {**fresh, 'recordedAt': '2026-10-11T08:00:00+00:00'}),
                (False, {**fresh, 'approvedAnswer': 'Keep it stopped'}),
            ]:
                with self.subTest(acknowledgement=acknowledgement):
                    approval = {'approvedAnswer': 'Resume on one CPU thread', 'cpuThreads': 1,
                                'ownerPid': 999999, 'ownerCreated': 2.0, 'freshStopApproval': acknowledgement}
                    (directory / 'approved-resume.json').write_text(json.dumps(approval))
                    result = subprocess.run([sys.executable, str(helper)], capture_output=True, text=True, timeout=10)
                    self.assertNotEqual(result.returncode, 0)
                    if valid:
                        self.assertIn('run-state.json', result.stderr)  # Authorization passed; no capture/model exists in this fixture.
                        self.assertNotIn('unknown stop cannot be retried', result.stderr)
                    else:
                        self.assertIn('unknown stop cannot be retried', result.stderr)
                    self.assertEqual(json.loads((directory / 'approved-resume.json').read_text()), approval)

    def test_saved_resume_helper_cannot_clear_a_new_resource_stop(self):
        workspace = Path(__file__).resolve().parents[2]
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            scripts = root / 'jobverify-backend/scripts'
            scripts.mkdir(parents=True)
            shutil.copy2(workspace / 'jobverify-backend/scripts/localTrialResourceGuard.py', scripts)
            directory = root / 'artifacts/trial'
            directory.mkdir(parents=True)
            helper = directory / 'resume-approved-one-thread.py'
            shutil.copy2(workspace / 'artifacts/full-gliclass-c10-2026-10-10-direct/resume-approved-one-thread.py', helper)
            stop = directory / 'resource-stop.json'
            original = '{"cpu":91,"status":"stopped_resource_limit"}'
            stop.write_text(original)
            result = subprocess.run([sys.executable, str(helper)], capture_output=True, text=True, timeout=10)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('new resource stop requires fresh approval', result.stderr)
            self.assertEqual(stop.read_text(), original)
            self.assertEqual(sorted(path.name for path in directory.iterdir()), ['resource-stop.json', helper.name])

    def fixture(self, directory):
        runner = Path(__file__).resolve().parents[1] / 'scripts/runPostScrapeTrial.js'
        owner = subprocess.Popen(['node', '-e', 'setTimeout(()=>{},300)', str(runner), str(directory)])
        started = datetime.now(timezone.utc).isoformat()
        meta = {'ownerPid': owner.pid, 'ownerCreated': psutil.Process(owner.pid).create_time(),
                'cpuThreads': 1, 'approvedAnswer': 'Resume on one CPU thread', 'startedAt': started}
        (directory / 'trial-pipeline.json').write_text(json.dumps({'pid': owner.pid, 'stage': 'classification_failed'}))
        (directory / 'classification-summary.json').write_text(json.dumps({'total': 1, 'completed': 0, 'skipped': 0, 'failed': 1}))
        (directory / 'title-recovery-source-audit.json').write_text(json.dumps({'jobs': [{'id': 'known'}]}))
        (directory / 'classification-failures.jsonl').write_text(json.dumps({'trialId': 'known', 'error': 'Title or metadata too long', 'attemptedAt': started})+'\n')
        return owner, meta

    def test_only_proven_title_failure_can_start_the_one_thread_retry(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); owner, meta = self.fixture(directory); calls = []
            try:
                result = recover(directory, meta, launch=lambda: calls.append('started') or 0)
                self.assertEqual(result['stage'], 'retry_started')
                self.assertEqual(calls, ['started'])
            finally:
                if owner.poll() is None: owner.terminate()
                owner.wait(timeout=5)

    def test_resource_stop_never_restarts_inference(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); owner, meta = self.fixture(directory); calls = []
            (directory / 'resource-stop.json').write_text('{"cpu":91}')
            try:
                result = recover(directory, meta, launch=lambda: calls.append('started') or 0)
                self.assertEqual(result['stage'], 'stopped_resource_limit')
                self.assertEqual(calls, [])
            finally:
                if owner.poll() is None: owner.terminate()
                owner.wait(timeout=5)

    def test_unrelated_failure_is_left_for_investigation(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); owner, meta = self.fixture(directory); calls = []
            (directory / 'classification-failures.jsonl').write_text(json.dumps({'trialId': 'known', 'error': 'Unexpected model failure', 'attemptedAt': meta['startedAt']})+'\n')
            try:
                result = recover(directory, meta, launch=lambda: calls.append('started') or 0)
                self.assertEqual(result['stage'], 'needs_manual_investigation')
                self.assertEqual(calls, [])
            finally:
                if owner.poll() is None: owner.terminate()
                owner.wait(timeout=5)

    def test_extended_audit_permits_only_its_proven_metadata_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); owner, meta = self.fixture(directory); calls = []
            (directory / 'extended-title-recovery-source-audit.json').write_text(json.dumps({'jobs': [{'id': 'icims'}]}))
            (directory / 'classification-failures.jsonl').write_text(json.dumps({'trialId': 'icims', 'error': 'Title or metadata too long', 'attemptedAt': meta['startedAt']})+'\n')
            try:
                result = recover(directory, meta, launch=lambda: calls.append('started') or 0,
                                 source_audit='extended-title-recovery-source-audit.json')
                self.assertEqual(result['stage'], 'retry_started')
                self.assertEqual(calls, ['started'])
            finally:
                if owner.poll() is None: owner.terminate()
                owner.wait(timeout=5)

    def test_arbitrary_recovery_manifests_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaises(ValueError):
                recover(Path(temporary), source_audit='../other.json')

    def test_disk_full_never_launches_a_retry(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); owner, meta = self.fixture(directory); calls = []
            try:
                with patch('recoverTrialTitleFailures.psutil.disk_usage', return_value=SimpleNamespace(free=0)):
                    result = recover(directory, meta, launch=lambda: calls.append('started') or 0)
                self.assertEqual(result['stage'], 'needs_manual_investigation')
                self.assertEqual(calls, [])
            finally:
                if owner.poll() is None: owner.terminate()
                owner.wait(timeout=5)


if __name__ == '__main__': unittest.main()
