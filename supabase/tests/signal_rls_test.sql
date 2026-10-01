begin;
select plan(20);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'other@example.com');

insert into public.relationships (id, user_id, display_name)
values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Aさん'),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Bさん');

insert into public.facts (id, relationship_id, text_original)
values
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '相手から来週の食事の予定を聞かれた。'),
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', '相手から帰宅後にメッセージが届いた。');

insert into public.analysis_snapshots (
  id, relationship_id, romantic_interest, desire_to_meet, initiative,
  evidence_sufficiency, model_version, rubric_version
)
values
  ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 70, 80, 65, 60, 'test', 'test'),
  ('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444', 40, 45, 35, 50, 'test', 'test');

select ok(
  not has_table_privilege('anon', 'public.relationships', 'select,insert,update,delete'),
  'anon has no relationship privileges'
);
select ok(
  not has_table_privilege('anon', 'public.facts', 'select,insert,update,delete'),
  'anon has no fact privileges'
);
select ok(
  not has_table_privilege('anon', 'public.analysis_snapshots', 'select,insert,update,delete'),
  'anon has no snapshot privileges'
);
select ok(
  not has_function_privilege('anon', 'public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)', 'execute'),
  'anon cannot call the atomic save function'
);

set local role anon;
select throws_ok($$select * from public.relationships$$, '42501', null, 'anon cannot read relationships');
select throws_ok($$select * from public.facts$$, '42501', null, 'anon cannot read facts');
select throws_ok($$select * from public.analysis_snapshots$$, '42501', null, 'anon cannot read snapshots');
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select id from public.relationships order by id$$,
  array['33333333-3333-3333-3333-333333333333'::uuid],
  'owner reads only their relationship'
);
select results_eq(
  $$select id from public.facts order by id$$,
  array['55555555-5555-5555-5555-555555555555'::uuid],
  'owner reads only their facts'
);
select results_eq(
  $$select id from public.analysis_snapshots order by id$$,
  array['77777777-7777-7777-7777-777777777777'::uuid],
  'owner reads only their snapshots'
);
select lives_ok(
  $$update public.relationships set display_name = '更新後' where id = '33333333-3333-3333-3333-333333333333'$$,
  'owner can rename their relationship'
);
select is(
  (select display_name from public.relationships where id = '33333333-3333-3333-3333-333333333333'),
  '更新後',
  'owner rename is persisted'
);
select is_empty(
  $$update public.relationships set display_name = '侵入' where id = '44444444-4444-4444-4444-444444444444' returning id$$,
  'owner cannot rename another user relationship'
);
select is(
  (select display_name from public.relationships where id = '44444444-4444-4444-4444-444444444444'),
  null,
  'other user relationship is not observable'
);
select throws_ok(
  $$insert into public.relationships (user_id, display_name) values ('11111111-1111-1111-1111-111111111111', '新規')$$,
  '42501', null, 'browser role cannot create relationships directly'
);
select throws_ok(
  $$insert into public.facts (relationship_id, text_original) values ('33333333-3333-3333-3333-333333333333', '相手から次の予定を聞かれたため記録する。')$$,
  '42501', null, 'browser role cannot insert facts directly'
);
select throws_ok(
  $$insert into public.analysis_snapshots (relationship_id, romantic_interest, desire_to_meet, initiative, evidence_sufficiency, model_version, rubric_version) values ('33333333-3333-3333-3333-333333333333', 60, 60, 60, 60, 'test', 'test')$$,
  '42501', null, 'browser role cannot insert snapshots directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.create_initial_relationship_analysis(uuid, text, jsonb, jsonb, uuid)', 'execute'),
  'authenticated users cannot call atomic save function'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select id from public.relationships order by id$$,
  array['44444444-4444-4444-4444-444444444444'::uuid],
  'other user reads only their relationship'
);
select is_empty(
  $$delete from public.relationships where id = '33333333-3333-3333-3333-333333333333' returning id$$,
  'other user cannot delete owner relationship'
);
reset role;

select * from finish();
rollback;
