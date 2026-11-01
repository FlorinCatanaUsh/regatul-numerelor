
create table regat_private.reading_progress(
 student_id text primary key references regat_private.students(id) on delete cascade,
 solved integer[] not null default '{}' check(solved <@ array[1]::integer[])
);
alter table regat_private.reading_progress enable row level security;
revoke all on regat_private.reading_progress from public,anon,authenticated;
grant select,insert,update on regat_private.reading_progress to service_role;
create or replace function public.regat_student_profile(p_student_id text) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('studentId',s.id,'displayName',s.display_name,'completedChapters',to_jsonb(s.completed_chapters),'lessonProgress',s.lesson_progress,'authenticated',true,
 'formation',jsonb_build_object('solved',coalesce(to_jsonb(f.solved),'[]'::jsonb),'keyTaken',coalesce(f.key_taken,false),'lesson2Allowed',coalesce(f.lesson2_allowed,false),'lesson2Opened',coalesce(f.lesson2_opened,false)),
 'reading',jsonb_build_object('solved',coalesce(to_jsonb(r.solved),'[]'::jsonb)))
 from regat_private.students s left join regat_private.formation_progress f on f.student_id=s.id
 left join regat_private.reading_progress r on r.student_id=s.id where s.id=p_student_id and s.enabled;
$$;
create function regat_private.normalize_reading(p_answer text) returns text language sql immutable security invoker set search_path='' as $$
 select trim(regexp_replace(regexp_replace(translate(lower(coalesce(p_answer,'')),'ăâîșşțţ','aaisstt'),'[^a-z0-9[:space:]]',' ','g'),'[[:space:]]+',' ','g'));
$$;
revoke all on function regat_private.normalize_reading(text) from public,anon,authenticated;
grant execute on function regat_private.normalize_reading(text) to service_role;
create function public.regat_reading(p_token text,p_action text,p_chest integer default null,p_answer text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare sid text; f regat_private.formation_progress%rowtype; good boolean;
begin
 select student_id into sid from regat_private.sessions where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now();
 if sid is null or not exists(select 1 from regat_private.students where id=sid and enabled) then return jsonb_build_object('ok',false,'error','unauthorized');end if;
 perform 1 from regat_private.students where id=sid for update;
 select * into f from regat_private.formation_progress where student_id=sid for update;
 if f.student_id is null or not(f.key_taken and f.lesson2_allowed and f.lesson2_opened) then return jsonb_build_object('ok',false,'error','lesson_locked');end if;
 if p_action='state' then return jsonb_build_object('ok',true,'profile',public.regat_student_profile(sid));
 elsif p_action='answer' then
  if p_chest is distinct from 1 then return jsonb_build_object('ok',false,'error','chest_missing');end if;
  good=length(coalesce(p_answer,'')) between 1 and 500 and regat_private.normalize_reading(p_answer)='patru mii noua sute douazeci si sapte';
  if good then
   insert into regat_private.reading_progress(student_id,solved) values(sid,array[1])
   on conflict(student_id) do update set solved=array[1];
  end if;
  return jsonb_build_object('ok',true,'correct',good,'profile',public.regat_student_profile(sid));
 end if;
 return jsonb_build_object('ok',false,'error','invalid_action');
end;$$;
revoke all on function public.regat_reading(text,text,integer,text) from public,anon,authenticated;
grant execute on function public.regat_reading(text,text,integer,text) to service_role;
