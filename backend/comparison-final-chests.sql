create or replace function public.regat_comparison(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean; expected text; star_count integer;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if lp#>>'{1,manualAccess,3}'='false' or not(coalesce(lp#>>'{1,manualAccess,3}'='true',false) or coalesce(lp#>'{1,unlocked}' @> '[3]'::jsonb,false)) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action='take_key' then
  select count(distinct value) into star_count from jsonb_array_elements_text(coalesce(lp#>'{1,comparisonSolved}','[]'::jsonb)) where value in ('1','2','3','4','5','6','7','8','9','10','11','12');
  if star_count<6 then return jsonb_build_object('ok',false,'error','six_stars');end if;
  update regat_private.students set lesson_progress=jsonb_set(jsonb_set(jsonb_set(lesson_progress,'{1,comparisonKeyTaken}','true'::jsonb,true),'{1,completed}',(select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,completed}','[]'::jsonb)) union select 3) a),true),'{1,unlocked}',(select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,unlocked}','[]'::jsonb)) union select 4) a),true) where id=sid;
  return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 end if;
 if p_action<>'answer' then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 expected=case p_chest when 1 then '<' when 2 then '>' when 3 then '<' when 4 then '<' when 5 then '=' when 6 then '<' when 7 then '>' when 8 then '>' when 9 then '=' when 10 then '>' when 11 then '<' when 12 then '=' end;
 if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
 good=coalesce(p_answer=expected,false);
 if good then
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,comparisonSolved}',
   (select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,comparisonSolved}','[]'::jsonb)) union select p_chest) a),true)
   where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
revoke all on function public.regat_comparison(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_comparison(text,text,integer,text) to service_role;
