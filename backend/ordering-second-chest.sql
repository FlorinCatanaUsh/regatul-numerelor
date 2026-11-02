create or replace function public.regat_ordering(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean; expected text;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if lp#>>'{1,manualAccess,4}'='false' or not(coalesce(lp#>>'{1,manualAccess,4}'='true',false) or coalesce(lp#>'{1,unlocked}' @> '[4]'::jsonb,false)) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action<>'answer' then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 expected=case p_chest when 1 then '2503,2530,3052,3205' when 2 then '476,2034,4001,4678' end;
 if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
 good=coalesce(p_answer=expected,false);
 if good then
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,orderingSolved}',
   (select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,orderingSolved}','[]'::jsonb)) union select p_chest) a),true)
   where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
revoke all on function public.regat_ordering(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_ordering(text,text,integer,text) to service_role;
