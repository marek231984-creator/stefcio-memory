const {execFileSync}=require('node:child_process');
const assert=require('node:assert/strict');
const {verifyContext}=require('../learner-context');
const php=process.env.PHP_BINARY || 'php';
const run=key=>execFileSync(php,['test/wordpress-adapter.php'],{encoding:'utf8',env:{...process.env,LINGUAI_TEST_KEY:key}});
const tokens=JSON.parse(run(''));
for(const [name,scope] of [['read','memory:get'],['save','memory:save']]) {
 const claims=verifyContext(tokens[name],'test-only-signing-key-at-least-32-characters',scope);
 assert.equal(claims.sub,11); assert.equal(claims.language,'chiński');
 assert.throws(()=>verifyContext(tokens[name],'test-only-secret',scope));
}
for(const key of ['missing','short','test-only-secret']) run(key);
console.log('PHP adapter and PHP-to-Node signatures passed; invalid keys rejected');
