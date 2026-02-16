-- Test different JSON_CONTAINS syntaxes
SELECT 
  JSON_CONTAINS('[1, 2, 3]', '1') AS test1,
  JSON_CONTAINS('[1, 2, 3]', '2') AS test2,
  JSON_CONTAINS('[1, 2, 3]', CAST(1 AS JSON)) AS test3,
  JSON_CONTAINS('[1, 2, 3]', JSON_ARRAY(1)) AS test4;
