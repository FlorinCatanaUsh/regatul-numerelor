create or replace function public.regat_roman(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; lp jsonb; good boolean; expected text; star_count integer; given_parts text[]; expected_parts text[]; checks jsonb;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 select lesson_progress into lp from regat_private.students where id=sid and enabled for update;
 if not found then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if lp#>>'{1,manualAccess,6}'='false' or not(coalesce(lp#>>'{1,manualAccess,6}'='true',false) or coalesce(lp#>'{1,unlocked}' @> '[6]'::jsonb,false)) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));end if;
 if p_action not in ('answer','match') then return jsonb_build_object('ok',false,'error','invalid_action');end if;
 expected=case p_chest when 1 then '3' when 2 then '14' when 3 then 'XXIII' when 4 then 'XIX' when 5 then '6,12,24,31' when 6 then '4,19,27,35' when 7 then '9,16,29,38' when 8 then '14,22,34,39' when 9 then '7,18,26,39' when 10 then '4,13,29,35' when 11 then '9,21,32,37' when 12 then '14,23,28,36' end;
 if expected is null then return jsonb_build_object('ok',false,'error','chest_missing');end if;
 if p_chest between 5 and 12 then
  if p_action<>'match' then return jsonb_build_object('ok',false,'error','invalid_action');end if;
  if p_answer is null or p_answer !~ '^([0-9]{1,2},){3}[0-9]{1,2}$' then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
  given_parts=string_to_array(p_answer,',');expected_parts=string_to_array(expected,',');
  if (select count(distinct v) from unnest(given_parts) v)<>4 then return jsonb_build_object('ok',false,'error','invalid_answer');end if;
  select jsonb_agg(given_parts[i]=expected_parts[i] order by i) into checks from generate_series(1,4) i;
  good=given_parts=expected_parts;
 else
  if p_action<>'answer' then return jsonb_build_object('ok',false,'error','invalid_action');end if;
  good=case when p_chest in (3,4) then regexp_replace(upper(btrim(p_answer)),'[[:space:]]','','g')=expected when btrim(p_answer) ~ '^[0-9]{1,5}$' then btrim(p_answer)::integer=expected::integer else false end;
 end if;
 if good then
  update regat_private.students set lesson_progress=jsonb_set(lesson_progress,'{1,romanSolved}',
   (select jsonb_agg(v order by v) from (select distinct value::integer v from jsonb_array_elements_text(coalesce(lesson_progress#>'{1,romanSolved}','[]'::jsonb)) union select p_chest) a),true)
   where id=sid;
 end if;
 return jsonb_build_object('ok',true,'correct',good,'matches',checks,'profile',public.regat_student_profile(sid));
end;$$;

