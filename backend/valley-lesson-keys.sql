create or replace function public.regat_take_valley_key(p_token text,p_lesson integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 sid text;
 progress jsonb;
 keys jsonb;
begin
 select s.student_id into sid from regat_private.sessions s
 where s.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and s.expires_at>now();
 if sid is null then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 if p_lesson is null or p_lesson not between 1 and 6 then
  return jsonb_build_object('ok',false,'error','invalid_lesson');
 end if;

 select s.lesson_progress into progress from regat_private.students s
 where s.id=sid and s.enabled and 1=any(s.completed_chapters) for update;
 if not found then return jsonb_build_object('ok',false,'error','chapter_locked');end if;
 keys:=coalesce(progress#>'{2,keysTaken}','{}'::jsonb);
 if keys->p_lesson::text='true'::jsonb then return jsonb_build_object('ok',true);end if;

 if (select count(distinct value) from jsonb_array_elements(
     coalesce(progress#>array['2','solvedByLesson',p_lesson::text],'[]'::jsonb)
    ) where value in (select to_jsonb(n) from generate_series(1,12) n))<6 then
  return jsonb_build_object('ok',false,'error','six_stars');
 end if;
 update regat_private.students set lesson_progress=jsonb_set(
  progress,'{2,keysTaken}',keys||jsonb_build_object(p_lesson::text,true)
 ) where id=sid;
 return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.regat_take_valley_key(text,integer) from public,anon,authenticated;
grant execute on function public.regat_take_valley_key(text,integer) to service_role;
