alter table regat_private.reading_progress drop constraint reading_progress_solved_check;
alter table regat_private.reading_progress add constraint reading_progress_solved_check check(solved <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::integer[]);
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
  expected=case p_chest when 1 then 'patru mii noua sute douazeci si sapte' when 2 then 'trei mii cincizeci si doi' when 3 then 'opt mii trei sute patru' when 4 then 'patru mii sapte sute cincisprezece' when 5 then '4623' when 6 then '8079' when 7 then '6004' when 8 then '7302' when 9 then 'cinci mii doua sute saptezeci si patru' when 10 then 'noua mii optzeci si sase' when 11 then '6342' when 12 then '8507' end;
  if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
  good=case when p_chest in (5,6,7,8,11,12) then coalesce(p_answer ~ '^[0-9]{4}$' and p_answer=expected,false) else length(coalesce(p_answer,'')) between 1 and 500 and regat_private.normalize_reading(p_answer)=expected end;
  if good then
   insert into regat_private.reading_progress(student_id,solved) values(sid,array[p_chest])
   on conflict(student_id) do update set solved=(select array_agg(distinct v order by v) from unnest(regat_private.reading_progress.solved||excluded.solved) v);
  end if;
  if (select count(distinct v) from regat_private.reading_progress r cross join lateral unnest(r.solved) v where student_id=sid)>=6 then
   update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,completed}',(select coalesce(jsonb_agg(distinct v),'[]'::jsonb) from jsonb_array_elements(coalesce(lesson_progress#>'{1,completed}','[]'::jsonb)||'[2]'::jsonb) v)) where id=sid;
  end if;
  return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
 elsif p_action='take_key' then
  if (select count(distinct v) from regat_private.reading_progress r cross join lateral unnest(r.solved) v where student_id=sid)<6 then return jsonb_build_object('ok',false,'error','six_stars');end if;
  update regat_private.reading_progress set key_taken=true where student_id=sid;
  return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 end if;
 return jsonb_build_object('ok',false,'error','invalid_action');
end;$$;
