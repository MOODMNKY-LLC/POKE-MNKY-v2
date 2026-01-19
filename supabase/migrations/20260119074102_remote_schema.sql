alter table "public"."binary_data" drop constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" drop constraint "CHK_workflow_publish_history_event";

alter table "public"."binary_data" add constraint "CHK_binary_data_sourceType" CHECK ((("sourceType")::text = ANY ((ARRAY['execution'::character varying, 'chat_message_attachment'::character varying])::text[]))) not valid;

alter table "public"."binary_data" validate constraint "CHK_binary_data_sourceType";

alter table "public"."workflow_publish_history" add constraint "CHK_workflow_publish_history_event" CHECK (((event)::text = ANY ((ARRAY['activated'::character varying, 'deactivated'::character varying])::text[]))) not valid;

alter table "public"."workflow_publish_history" validate constraint "CHK_workflow_publish_history_event";

-- Storage triggers (only if storage schema exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    DROP TRIGGER IF EXISTS enforce_bucket_name_length_trigger ON storage.buckets;
    CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    DROP TRIGGER IF EXISTS objects_delete_delete_prefix ON storage.objects;
    CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

    DROP TRIGGER IF EXISTS objects_insert_create_prefix ON storage.objects;
    CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

    DROP TRIGGER IF EXISTS objects_update_create_prefix ON storage.objects;
    CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

    DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
    CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'prefixes') THEN
    DROP TRIGGER IF EXISTS prefixes_create_hierarchy ON storage.prefixes;
    CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

    DROP TRIGGER IF EXISTS prefixes_delete_hierarchy ON storage.prefixes;
    CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();
  END IF;
END $$;


