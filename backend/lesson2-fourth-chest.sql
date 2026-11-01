alter table regat_private.reading_progress drop constraint reading_progress_solved_check;
alter table regat_private.reading_progress add constraint reading_progress_solved_check check(solved <@ array[1,2,3,4]::integer[]);
create or replace function public.regat_reading(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; f regat_private.formation_progress%rowtype; good boolean; expected text;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null or not exists(select 1 from regat_private.students where id=sid and enabled) then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 perform 1 from regat_private.students where id=sid for update;
 select * into f from regat_private.formation_progress where student_id=sid for update;
 if f.student_id is null or not(f.key_taken and f.lesson2_allowed and f.lesson2_opened) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 elsif p_action='answer' then
  expected=case p_chest when 1 then 'patru mii noua sute douazeci si sapte' when 2 then 'trei mii cincizeci si doi' when 3 then 'opt mii trei sute patru' when 4 then 'patru mii sapte sute cincisprezece' end;
  if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
  good=length(coalesce(p_answer,'')) between 1 and 500 and regat_private.normalize_reading(p_answer)=expected;
  if good then
   insert into regat_private.reading_progress(student_id,solved) values(sid,array[p_chest])
   on conflict(student_id) do update set solved=(select array_agg(distinct v order by v) from unnest(regat_private.reading_progress.solved||excluded.solved) v);
  end if;
  return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
 end if;
 return jsonb_build_object('ok',false,'error','invalid_action');
end;$$;
