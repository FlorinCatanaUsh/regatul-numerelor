create or replace function public.regat_borrow(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if not exists(select 1 from regat_private.students where id=sid and 1=any(completed_chapters)) then return jsonb_build_object('ok',false,'error','chapter_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action<>'answer' or p_chest is null or p_chest<1 or p_chest>12 or p_answer is null or btrim(p_answer)!~'^[0-9]{1,5}$' then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
 good=btrim(p_answer)::integer=case p_chest when 1 then 424 when 2 then 364 when 3 then 733 when 4 then 274 when 5 then 4725 when 6 then 4846 when 7 then 4647 when 8 then 5627 when 9 then 9085 when 10 then 8535 when 11 then 8515 when 12 then 8447 end;
 if good then
  lp=jsonb_set(lp,'{2}',coalesce(lp->'2','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson}',coalesce(lp#>'{2,solvedByLesson}','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson,4}',(select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lp#>'{2,solvedByLesson,4}','[]'::jsonb)) union select p_chest)a),true);
  update regat_private.students set lesson_progress=lp where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
revoke all on function public.regat_borrow(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_borrow(text,text,integer,text) to service_role;
