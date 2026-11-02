create or replace function public.regat_rounding(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean; expected text; star_count integer;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if lp#>>'{1,manualAccess,5}'='false' or not(coalesce(lp#>>'{1,manualAccess,5}'='true',false) or coalesce(lp#>'{1,unlocked}' @> '[5]'::jsonb,false)) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action<>'answer' then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 expected=case p_chest when 1 then '50' when 2 then '460' when 3 then '6450' when 4 then '7280' when 5 then '500' when 6 then '500' when 7 then '6500' when 8 then '3800' when 9 then '2000' when 10 then '5000' when 11 then '6000' when 12 then '9000' end;
 if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
 good=case when btrim(p_answer) ~ '^[0-9]{1,5}$' then btrim(p_answer)::integer=expected::integer else false end;
 if good then
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,roundingSolved}',
   (select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,roundingSolved}','[]'::jsonb)) union select p_chest) a),true)
   where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
