from pathlib import Path
methods = {
'Emails': [
('send','array $body, ?string $idempotencyKey = null',"'POST', '', $body, [], $idempotencyKey"),
('get','string $id',"'GET', '/' . rawurlencode($id)"),
('list','array $query = []',"'GET', '', null, $query"),
('cancel','string $id, ?string $idempotencyKey = null',"'POST', '/' . rawurlencode($id) . '/cancel', null, [], $idempotencyKey"),
('batch','array $emails, ?string $idempotencyKey = null',"'POST', '/batch', ['emails' => $emails], [], $idempotencyKey"),
('events','string $id',"'GET', '/' . rawurlencode($id) . '/events'")],
'Domains': [('create','array $body, ?string $idempotencyKey = null',"'POST', '', $body, [], $idempotencyKey"),
('cloudflare','string $id, array $body, ?string $idempotencyKey = null',"'POST', '/' . rawurlencode($id) . '/cloudflare', $body, [], $idempotencyKey")],
'ApiKeys': [('create','array $body, ?string $idempotencyKey = null',"'POST', '', $body, [], $idempotencyKey"),('revoke','string $id',"'DELETE', '/' . rawurlencode($id)")],
'Webhooks': [('create','array $body, ?string $idempotencyKey = null',"'POST', '', $body, [], $idempotencyKey"),('deliveries','string $id, array $query = []',"'GET', '/' . rawurlencode($id) . '/deliveries', null, $query")],
'Suppressions': [('list','array $query = []',"'GET', '', null, $query"),('add','array $body, ?string $idempotencyKey = null',"'POST', '', array_merge(['reason' => 'manual'], $body), [], $idempotencyKey"),('remove','string $email',"'DELETE', '/' . rawurlencode($email)")],
'Templates': [('create','array $body, ?string $idempotencyKey = null',"'POST', '', $body, [], $idempotencyKey"),('update','string $id, array $body',"'PUT', '/' . rawurlencode($id), $body"),('render','string $id, array $variables, ?string $idempotencyKey = null',"'POST', '/' . rawurlencode($id) . '/render', ['variables' => (object)$variables], [], $idempotencyKey")],
'Account': [('get','',"'GET'"),('setPlan','string $plan',"'PUT', '/plan', ['plan' => $plan]")],
'Plans': [('list','',"'GET'")], 'Stats':[('get','array $query = []',"'GET', '', null, $query")]
}
for name in ['Domains','ApiKeys','Webhooks','Templates']:
    methods[name].append(('list','',"'GET'"))
for name in ['Domains','Templates']:
    methods[name].append(('get','string $id',"'GET', '/' . rawurlencode($id)"))
for name in ['Domains','Webhooks','Templates']:
    methods[name].append(('remove','string $id',"'DELETE', '/' . rawurlencode($id)"))
for name, actions in [('Domains',['verify']),('ApiKeys',['rotate']),('Webhooks',['test','rotate'])]:
    for action in actions:
        methods[name].append((action,'string $id, ?string $idempotencyKey = null',f"'POST', '/' . rawurlencode($id) . '/{action}', null, [], $idempotencyKey"))
for name, rows in methods.items():
    text = '<?php\ndeclare(strict_types=1);\nnamespace MonaMail;\nclass ' + name + ' extends Resource\n{\n'
    for method,args,call in rows:
        text += f'    public function {method}({args}): mixed\n    {{ return $this->call({call}); }}\n'
    Path(__file__).parent.joinpath('src',name+'.php').write_text(text+'}\n')
