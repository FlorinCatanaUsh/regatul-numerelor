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
 if p_action<>'answer' or p_chest is distinct from 1 or p_answer is null or btrim(p_answer)!~'^[0-9]{1,2},[0-9]{1,2},[+-],[0-9]{1,2},[0-9]{1,2},[+-],[0-9]{1,2}$' then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
 good=btrim(p_answer) in ('42,42,-,15,42,-,27','42,42,-,27,42,-,15');
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
