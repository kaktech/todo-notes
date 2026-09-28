# AGENTS.md

- Write tests for ALL endpoints you create, covering success cases and error cases (404, invalid input).
- Always validate that endpoints work well: run the test suite after every change to the backend, and do not say a task is done until all tests pass.
- Tests must use a separate temporary SQLite database, never the real todos.db.
- Also run the real server and check key endpoints with curl before finishing.
- Keep code simple and commented, because the owner is a beginner.
- If a command or test fails, fix the cause and re-run. Never skip or delete a failing test to make it pass.
