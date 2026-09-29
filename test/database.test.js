const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

test('empty database restore, atomic memory history and learner/language isolation', async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase-managed Auth contract; never connect tests to production.
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA extensions;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, phone text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
    await db.exec(fs.readFileSync('database/schema.sql', 'utf8'));
    const save = (id, lang, patch) => db.query('SELECT public.linguai_save_memory($1,$2,$3) AS memory', [id,lang,JSON.stringify(patch)]);
    await db.exec('SET ROLE service_role');
    await save(901, 'włoski', {name:'Test A',level:'A0',next_lesson_plan:'Test plan'});
    await save(901, 'angielski', {name:'Test A',level:'B1'});
    await save(902, 'włoski', {name:'Test B',level:'C1'});
    await save(901, 'chiński', {level:'A1'});
    await save(901, 'włoski', {last_lesson_topic:'Test topic'});
    const r = (await db.query('SELECT * FROM student_memory WHERE wp_user_id=901 AND language=$1',['włoski'])).rows[0];
    assert.equal(r.level,'A0'); assert.equal(r.next_lesson_plan,'Test plan');
    assert.equal(r.last_lesson_topic,'Test topic');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM student_memory_history')).rows[0].n,5);
    await assert.rejects(save(901,'polski',{}));
    await assert.rejects(save(901,'włoski',{level:'C2'}));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM student_memory_history')).rows[0].n,5);
    await db.exec('RESET ROLE; SET ROLE anon');
    await assert.rejects(save(901,'włoski',{level:'C1'}));
    assert.equal((await db.query('SELECT * FROM student_memory')).rows.length,0);
    await db.exec('RESET ROLE; SET ROLE authenticated');
    await assert.rejects(save(901,'włoski',{level:'C1'}));
    assert.equal((await db.query('SELECT * FROM student_memory')).rows.length,0);
    await db.exec('RESET ROLE');
    const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
    await db.query('INSERT INTO auth.users(id,email) VALUES($1,$2),($3,$4)',[a,'a@example.invalid',b,'b@example.invalid']);
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[a]);
    await db.exec('SET ROLE authenticated');
    assert.deepEqual((await db.query('SELECT user_id FROM student_memory')).rows.map(r=>r.user_id),[a]);
    await assert.rejects(db.query('UPDATE student_memory SET user_id=$1 WHERE user_id=$2',[b,a]));
    assert.equal((await db.query('UPDATE student_memory SET name=$1 WHERE user_id=$2 RETURNING id',['Changed',b])).rows.length,0);
    await db.exec('RESET ROLE');
    // A history failure must roll back the upsert in the same RPC transaction.
    await db.exec(`CREATE FUNCTION public.test_fail_history() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'test history failure'; END $$;
      CREATE TRIGGER test_fail_history BEFORE INSERT ON student_memory_history
      FOR EACH ROW EXECUTE FUNCTION public.test_fail_history(); SET ROLE service_role;`);
    await assert.rejects(save(901,'włoski',{level:'B2'}));
    assert.equal((await db.query('SELECT level FROM student_memory WHERE wp_user_id=901 AND language=$1',['włoski'])).rows[0].level,'A0');
  } finally { await db.close(); }
});
