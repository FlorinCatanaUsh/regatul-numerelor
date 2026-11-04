create or replace function public.regat_proof(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if not exists(select 1 from regat_private.students where id=sid and 1=any(completed_chapters)) then return jsonb_build_object('ok',false,'error','chapter_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action<>'answer' or (p_chest is null or p_chest not between 1 and 12) or p_answer is null or btrim(p_answer)!~(case when p_chest in (7,8,11,12) then '^[0-9]{1,3}(,[0-9]{1,3}){3},[AF]$' when p_chest in (5,6,9,10) then '^[0-9]{1,3},[0-9]{1,3},[+-],[0-9]{1,3},[0-9]{1,3},[AF]$' when p_chest in (3,4) then '^[0-9]{1,3}(,[0-9]{1,3}){3}$' else '^[0-9]{1,3},[0-9]{1,3},[+-],[0-9]{1,3},[0-9]{1,3},[+-],[0-9]{1,3}$' end) then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
 good=case p_chest
  when 1 then btrim(p_answer) in ('42,42,-,15,42,-,27','42,42,-,27,42,-,15')
  when 2 then btrim(p_answer) in ('432,432,-,158,432,-,274','432,432,-,274,432,-,158')
  when 3 then btrim(p_answer) in ('276,276,302,578','276,302,276,578')
  when 4 then btrim(p_answer) = '276,578,276,302'
  when 5 then btrim(p_answer) in ('910,910,-,453,457,F','910,910,-,467,443,F')
  when 6 then btrim(p_answer) in ('920,920,-,453,467,A','920,920,-,467,453,A')
  when 7 then btrim(p_answer) in ('319,426,319,745,A','319,319,426,745,A')
  when 8 then btrim(p_answer) = '161,587,161,426,F'
  when 9 then btrim(p_answer) in ('625,625,-,368,257,A','625,625,-,257,368,A')
  when 10 then btrim(p_answer) in ('751,751,-,486,265,F','751,751,-,275,476,F')
  when 11 then btrim(p_answer) in ('567,267,567,834,A','567,567,267,834,A')
  when 12 then btrim(p_answer) = '454,902,454,448,F'
 end;
 if good then
  lp=jsonb_set(lp,'{2}',coalesce(lp->'2','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson}',coalesce(lp#>'{2,solvedByLesson}','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson,5}',(select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lp#>'{2,solvedByLesson,5}','[]'::jsonb)) union select p_chest)a),true);
  update regat_private.students set lesson_progress=lp where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
revoke all on function public.regat_proof(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_proof(text,text,integer,text) to service_role;
