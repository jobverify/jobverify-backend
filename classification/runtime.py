"""One CPU checkpoint, localhost only. MongoDB writes remain in the Node scraper."""
import argparse
from datetime import datetime, timedelta, timezone
from collections import Counter, OrderedDict
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
import re
from pathlib import Path
import threading
import time

ROOT = Path(__file__).resolve().parent
POLICY_BYTES = (ROOT / 'policy.json').read_bytes().replace(b'\r\n', b'\n')
POLICY = json.loads(POLICY_BYTES)
MODEL = json.loads((ROOT / 'model.json').read_text())
POLICY_HASH = hashlib.sha256(POLICY_BYTES).hexdigest()
RUNTIME_FILES = ['classification/model.json', 'classification/requirements.txt', 'classification/runtime.py', 'classification/training.py', 'src/services/jobClassificationPolicy.js', 'src/services/jobRecruitmentPolicy.js', 'src/utils/jobClassificationVersion.js', 'src/utils/jobFilterSignals.js', 'src/utils/jobSourceContent.js']
RUNTIME_HASH = hashlib.sha256(json.dumps([[name, hashlib.sha256((ROOT.parent / name).read_bytes().replace(b'\r\n', b'\n')).hexdigest()] for name in RUNTIME_FILES], separators=(',', ':')).encode()).hexdigest()
IDENTITY = {'modelRevision': MODEL['revision'], 'runtimeVersion': MODEL['runtimeVersion'], 'runtimeHash': RUNTIME_HASH, 'policyHash': POLICY_HASH, 'calibrationHash': 'uncalibrated'}
ABSTAIN = {'employment': 'unspecified', 'experience': 'not_stated', 'seniority': 'unknown', 'leadership': 'unknown'}


def calibrated_answer(answer, temperature):
    probabilities = answer['probabilities']
    if not probabilities or any(not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1 for value in probabilities.values()):
        raise ValueError('invalid probabilities')
    if not .1 <= temperature <= 10 or abs(sum(probabilities.values()) - 1) > .002:
        raise ValueError('invalid calibration or probability sum')
    powered = {key: max(value, 1e-12) ** (1 / temperature) for key, value in probabilities.items()}
    total = sum(powered.values())
    result = {key: value / total for key, value in powered.items()}
    choice = max(result, key=result.get)
    return {'choice': choice, 'probabilities': result, 'answer_confidence': result[choice]}


def aggregate_answers(windows, thresholds):
    answers, conflicts = {}, []
    for key in POLICY['questions']:
        available = [window[key] for window in windows if key in window]
        if not available:
            continue
        informative = [a for a in available if a['choice'] != ABSTAIN[key]]
        confident = {a['choice'] for a in informative if a['probabilities'][a['choice']] >= thresholds[key]}
        if len(confident) > 1:
            conflicts.append(key)
        candidates = informative or available
        winner = Counter(a['choice'] for a in candidates).most_common(1)[0][0]
        # Keep the weakest supporting distribution, rather than claiming a maximum-window confidence.
        answers[key] = min((a for a in candidates if a['choice'] == winner), key=lambda a: a['probabilities'][winner])
    return {'answers': answers, 'conflicts': conflicts}


def release_digest(release):
    payload = {key: value for key, value in release.items() if key != 'artifactHash'}
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


def load_release(path):
    if not path or not Path(path).is_file():
        return None
    release = json.loads(Path(path).read_text())
    metrics = release.get('testMetrics', {})
    counts = release.get('counts', {})
    if (release.get('approved') is not True or release.get('artifactHash') != release_digest(release)
            or release.get('identity') != {key: value for key, value in IDENTITY.items() if key != 'calibrationHash'}
            or counts.get('validation', 0) < 200 or counts.get('test', 0) < 300
            or counts.get('testInternships', 0) < 50 or counts.get('testLeadership', 0) < 50
            or metrics.get('employmentPrecision', 0) < .95 or metrics.get('experiencePrecision', 0) < .95 or metrics.get('internshipPrecision', 0) < .98
            or metrics.get('coverage', 0) < .70 or metrics.get('managerToInternErrors', 1) != 0
            or metrics.get('targetAccuracy', 0) <= metrics.get('baselineTargetAccuracy', 1)
            or release.get('humanLabels') is not True):
        raise ValueError('release evaluation gate is missing, incompatible, or failed')
    for key in POLICY['questions']:
        temperature = release.get('temperatures', {}).get(key)
        threshold = release.get('thresholds', {}).get(key)
        if not isinstance(temperature, (int, float)) or not .1 <= temperature <= 10 or not isinstance(threshold, (int, float)) or not .8 <= threshold <= 1:
            raise ValueError('invalid release calibration')
    return release


def source_context(request):
    # Repeat employer requirements in every window. Do not feed scraper-inferred experience back to the model.
    facts = [('Vacancy title', request.get('title')), ('Employer employment field', request.get('sourceEmploymentType')),
             ('Required professional experience (employer field)', request.get('sourceExperienceRequired')),
             ('Eligible graduation batches', request.get('eligibleBatches') if request.get('eligibleBatchesProvenance') == 'source' else None), ('Publication date', request.get('postedDate')),
             ('Current reference year (Asia/Kolkata)', request.get('referenceYear'))]
    context = ''.join('%s: %s\n' % (label, value) for label, value in facts if value is not None and value != '' and value != [])
    # Explain bare ATS ranges without deriving work experience from graduation dates.
    experience = str(request.get('sourceExperienceRequired', '')).strip()
    bounds = re.fullmatch(r'(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?', experience)
    if bounds and (bounds[2] is None or float(bounds[2]) >= float(bounds[1])):
        context += 'Minimum required professional experience: %s years.\n' % bounds[1]
        if float(bounds[1]) == 0:
            context += 'This employer experience field permits applicants without prior professional experience.\n'
    return context + 'Vacancy text:\n'


def audit_question_budget(agent, build_head=None, render_options=None):
    if build_head is None or render_options is None:
        from laya.common import build_head, render_options
    audit = {}
    for key, question in POLICY['questions'].items():
        internal = agent._to_internal(question)
        head, markers, stats = build_head(agent.tok, internal, agent.cfg['head_max_len'])
        instructions = internal.get('ins', question['instructions']).replace(agent.tok.mask_token, ' ')
        full = agent.tok.encode('%s question: %s' % (question['type'], instructions), add_special_tokens=False)
        observed = head[1:head.index(agent.tok.sep_token_id)]
        if observed != full:
            raise ValueError('%s instructions exceed the model question budget' % key)
        if stats['options_distinct'] != stats['options']:
            raise ValueError('%s options become indistinguishable' % key)
        for index, option in enumerate(render_options(internal)):
            full_option = agent.tok.encode(' ' + option.replace(agent.tok.mask_token, ' '), add_special_tokens=False)
            end = markers[index + 1] if index + 1 < len(markers) else len(head) - 1
            if head[markers[index] + 1:end] != full_option:
                raise ValueError('%s option exceeds the model question budget' % key)
        audit[key] = {'instructionTokens': len(full), 'headTokens': len(head), 'stateRoom': agent.cfg['max_len'] - len(head) - 1,
                      'optionsDistinct': stats['options_distinct']}
    return audit


def load_agent():
    if os.name == 'nt':
        # Complete the Hub capability probe before concurrent snapshot downloads.
        # Otherwise another thread can observe its provisional True on Windows.
        from huggingface_hub import constants
        from huggingface_hub.file_download import are_symlinks_supported
        are_symlinks_supported(Path(constants.HF_HUB_CACHE) / ('models--' + MODEL['modelId'].replace('/', '--')))
    from laya import Agent
    agent = Agent(MODEL['modelId'], subfolder=MODEL['subfolder'], revision=MODEL['revision'], device='cpu')
    if MODEL.get('headAdapter'):
        from training import load_head_adapter
        load_head_adapter(agent, MODEL['headAdapter'])
    return agent


def source_windows(agent, request, room_function=None):
    if room_function is None:
        from laya.common import state_room
        room_function = state_room
    tokenizer = agent.tok
    facts = source_context(request).replace(tokenizer.mask_token, ' ')
    body = request.get('body', '')
    if len(body.encode()) > MODEL['maxInputBytes']:
        return [], 'input_too_large'
    internal = [agent._to_internal(q) for q in POLICY['questions'].values()]
    room = min(room_function(tokenizer, q, agent.cfg['max_len'], agent.cfg['head_max_len']) for q in internal)
    budget = room - len(tokenizer.encode(facts, add_special_tokens=False)) - 16
    if budget < 32:
        return [], 'facts_too_large'
    tokens = tokenizer.encode(body.replace(tokenizer.mask_token, ' '), add_special_tokens=False)
    start, states = 0, []
    while start < len(tokens) or (not tokens and not states):
        end = min(start + budget, len(tokens))
        state = facts + tokenizer.decode(tokens[start:end], skip_special_tokens=True)
        while len(tokenizer.encode(state, add_special_tokens=False)) > room and end > start:
            end -= max(1, (end - start) // 10)
            state = facts + tokenizer.decode(tokens[start:end], skip_special_tokens=True)
        if end <= start and tokens:
            return [], 'facts_too_large'
        states.append(state)
        if end >= len(tokens):
            break
        overlap = min(MODEL['windowOverlapTokens'], max(1, (end - start) // 3))
        start = max(start + 1, end - overlap)
    return states, None


class Classifier:
    def __init__(self, agent, room=None, release=None):
        if room is None:
            from laya.common import state_room
            room = state_room
        self.agent, self.room = agent, room
        self.release = release
        self.thresholds = release['thresholds'] if release else POLICY['thresholds']
        self.temperatures = release['temperatures'] if release else {}
        self.identity = {**IDENTITY, 'calibrationHash': release['artifactHash'] if release else 'uncalibrated'}
        self.lock = threading.Lock()
        self.cache = OrderedDict()
        self.stats = Counter()

    def classify(self, request, deadline=None, include_windows=False):
        deadline = deadline if deadline is not None else time.monotonic() + MODEL['requestSeconds']
        questions = POLICY['questions']
        agent = self.agent
        states, reason = source_windows(agent, request, self.room)
        if reason:
            return {'complete': False, 'windows': 0, 'answers': {}, 'reason': reason, 'identity': self.identity}
        windows, complete, deadline_exceeded = [], True, False
        for state in states:
            if time.monotonic() >= deadline:
                complete = False
                deadline_exceeded = True
                break
            result = agent.predict(state, questions)
            if set(result.get('answers', {})) != set(questions):
                raise ValueError('model response has missing questions')
            dropped = result.get('usage', {}).get('state_tokens_dropped')
            if type(dropped) is not int or dropped < 0:
                raise ValueError('model response lacks valid truncation accounting')
            if time.monotonic() >= deadline:
                complete = False
                deadline_exceeded = True
            if dropped > 0:
                complete = False
            decoded = {}
            for key, value in result['answers'].items():
                if key not in questions or set(value['probabilities']) != set(questions[key]['criteria']):
                    raise ValueError('unexpected labels')
                decoded[key] = calibrated_answer(value, self.temperatures.get(key, 1))
            windows.append(decoded)
        return {**aggregate_answers(windows, self.thresholds), 'complete': complete and bool(windows), 'windows': len(windows), 'identity': self.identity,
                **({'reason': 'request_deadline'} if deadline_exceeded else {}),
                **({'windowAnswers': windows} if include_windows else {})}

    def handle(self, request):
        request_deadline = time.monotonic() + MODEL['requestSeconds'] - 1
        if not self.lock.acquire(blocking=False):
            self.stats['busy'] += 1
            return 503, {'error': 'busy'}
        try:
            if request.get('identity') != self.identity:
                return 409, {'error': 'identity_mismatch'}
            key = request.get('inputHash')
            if key in self.cache:
                self.stats['cached'] += 1
                self.cache.move_to_end(key)
                return 200, self.cache[key]
            result = self.classify(request, request_deadline)
            self.stats['classified'] += 1
            self.stats['incomplete'] += int(not result['complete'])
            self.stats['conflicting'] += int(bool(result.get('conflicts')))
            if result['complete'] and key:
                self.cache[key] = result
                if len(self.cache) > 5000:
                    self.cache.popitem(last=False)
            return 200, result
        finally:
            self.lock.release()


def serve(worker, port):
    slots = threading.BoundedSemaphore(8)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # no job text, secrets, or per-request logs
        def respond(self, status, payload):
            body = json.dumps(payload, allow_nan=False).encode()
            try:
                self.send_response(status)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except OSError:
                pass
        def do_GET(self):
            if self.path == '/health':
                self.respond(200, {'ready': True, 'instanceId': os.environ.get('LAYA_INSTANCE_ID'), 'identity': worker.identity, 'enforceAllowed': bool(worker.release), 'thresholds': worker.thresholds, 'stats': dict(worker.stats)})
            else:
                self.respond(404, {'error': 'not_found'})
        def do_POST(self):
            if self.path != '/classify':
                return self.respond(404, {'error': 'not_found'})
            if not slots.acquire(blocking=False):
                return self.respond(503, {'error': 'busy'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= MODEL['maxInputBytes'] + 16384:
                    return self.respond(413, {'error': 'input_too_large'})
                self.connection.settimeout(5)
                request = json.loads(self.rfile.read(length))
                if not isinstance(request.get('body'), str) or not isinstance(request.get('title'), str) or len(request['title']) > 1024 or not isinstance(request.get('referenceYear'), int):
                    return self.respond(400, {'error': 'invalid_input'})
                status, result = worker.handle(request)
                self.respond(status, result)
            except (ValueError, KeyError, TypeError):
                worker.stats['invalid'] += 1
                self.respond(400, {'error': 'invalid_input_or_output'})
            except Exception:
                worker.stats['errors'] += 1
                self.respond(500, {'error': 'inference_failed'})
            finally:
                slots.release()
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    server.daemon_threads = True
    server.serve_forever()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    release = load_release(os.environ.get('LAYA_RELEASE_FILE'))
    import torch
    default_threads = min(8, os.cpu_count() or 1)
    torch.set_num_threads(max(1, min(8, int(os.environ.get('LAYA_CPU_THREADS', str(default_threads))))))
    agent = load_agent()
    question_audit = audit_question_budget(agent)
    worker = Classifier(agent, release=release)
    reference_year = datetime.now(timezone(timedelta(hours=5, minutes=30))).year
    warmup = worker.classify({'title': 'Graduate Engineer', 'body': 'Permanent full-time graduate role. Freshers eligible.', 'referenceYear': reference_year})
    if not warmup['complete']:
        raise RuntimeError('warmup failed')
    print(json.dumps({'ready': True, 'identity': worker.identity, 'enforceAllowed': bool(release), 'questionBudget': question_audit}), flush=True)
    serve(worker, args.port)


if __name__ == '__main__':
    main()
