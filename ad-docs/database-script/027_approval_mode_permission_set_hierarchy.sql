-- ADWest PostgreSQL migration: approval workflow definition hierarchy mapping by permission sets
-- - approval_mode values are now sourced from enum_values (enum_type='approval_mode')
-- - stages JSON now stores approverPermissionSetId (instead of approverPermissionId)
-- - stages JSON optionally stores parentStageId for org-chart hierarchy mapping

ALTER TABLE IF EXISTS adwest.approval_workflow_definitions
  ALTER COLUMN approval_mode TYPE varchar(60);

-- Backfill existing stage JSON payloads from approverPermissionId -> approverPermissionSetId.
WITH wf AS (
  SELECT
    id,
    COALESCE(stages, '[]'::jsonb) AS stages
  FROM adwest.approval_workflow_definitions
),
rebuilt AS (
  SELECT
    wf.id,
    COALESCE(
      jsonb_agg(
        CASE
          WHEN elem ? 'approverPermissionSetId' THEN elem
          WHEN elem ? 'approverPermissionId' THEN
            (elem - 'approverPermissionId') || jsonb_build_object('approverPermissionSetId', elem->>'approverPermissionId')
          ELSE elem
        END
        ORDER BY ordinality
      ),
      '[]'::jsonb
    ) AS stages
  FROM wf
  LEFT JOIN LATERAL jsonb_array_elements(wf.stages) WITH ORDINALITY AS e(elem, ordinality) ON true
  GROUP BY wf.id
)
UPDATE adwest.approval_workflow_definitions t
SET stages = rebuilt.stages
FROM rebuilt
WHERE t.id = rebuilt.id;
