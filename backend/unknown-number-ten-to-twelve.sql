create or replace function public.regat_unknown_number(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if not exists(select 1 from regat_private.students where id=sid and 1=any(completed_chapters)) then return jsonb_build_object('ok',false,'error','chapter_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action<>'answer' or p_chest is null or p_chest not between 1 and 12 or p_answer is null or btrim(p_answer)!~(case when p_chest>=9 then '^([+=-],[0-9]{1,5},){5}[0-9]{1,5},[+-],[0-9]{1,5},[0-9]{1,5}$' when p_chest>=5 then '^[+-],[0-9]{1,5},[0-9]{1,5},[0-9]{1,5},[+-],[0-9]{1,5},[0-9]{1,5}$' else '^[0-9]{1,5},[+-],[0-9]{1,5},[0-9]{1,5}$' end) then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
 good=case p_chest
  when 1 then btrim(p_answer)='549,-,348,201'
  when 2 then btrim(p_answer)='758,-,528,230'
  when 3 then btrim(p_answer) in ('578,+,463,1041','463,+,578,1041')
  when 4 then btrim(p_answer)='752,-,436,316'
  when 5 then btrim(p_answer)='+,264,3916,3916,-,430,3486'
  when 6 then btrim(p_answer)='-,210,669,669,-,437,232'
  when 7 then btrim(p_answer) in ('+,352,5078,5078,+,557,5635','+,352,5078,557,+,5078,5635')
  when 8 then btrim(p_answer) in ('-,254,6204,6204,+,745,6949','-,254,6204,745,+,6204,6949')
  when 9 then btrim(p_answer) in ('+,430,=,3652,+,264,+,430,=,3916,3916,-,430,3486','+,430,=,264,+,3652,+,430,=,3916,3916,-,430,3486')
  when 10 then btrim(p_answer)='+,325,=,912,-,146,+,325,=,766,766,-,325,441'
  when 11 then btrim(p_answer) in ('-,286,=,1398,+,157,-,286,=,1555,1555,+,286,1841','-,286,=,1398,+,157,-,286,=,1555,286,+,1555,1841','-,286,=,157,+,1398,-,286,=,1555,1555,+,286,1841','-,286,=,157,+,1398,-,286,=,1555,286,+,1555,1841')
  when 12 then btrim(p_answer) in ('-,518,=,1704,-,236,-,518,=,1468,1468,+,518,1986','-,518,=,1704,-,236,-,518,=,1468,518,+,1468,1986')
 end;
 if good then
  lp=jsonb_set(lp,'{2}',coalesce(lp->'2','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson}',coalesce(lp#>'{2,solvedByLesson}','{}'::jsonb),true);
  lp=jsonb_set(lp,'{2,solvedByLesson,7}',(select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lp#>'{2,solvedByLesson,7}','[]'::jsonb)) union select p_chest)a),true);
  update regat_private.students set lesson_progress=lp where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
end;$$;
revoke all on function public.regat_unknown_number(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_unknown_number(text,text,integer,text) to service_role;
