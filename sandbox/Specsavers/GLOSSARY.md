 # Glossary of Terms

 This document defines the key terms used throughout the QA Proxy application:

 **Rule**
 A specification of criteria for matching and evaluating HTTP(S) request flows. A Rule has:
 - `id`: unique identifier
 - `domain`: host to match
 - `method`: HTTP method (e.g., GET, POST)
 - `path`: request path (glob patterns may be supported)
 - `conditions`: array of Condition objects
 - `children`: array of child Rule `id`s, evaluated only if the parent passes

 **Event**
 Notifications emitted by the proxy during runtime:
 - `flow`: raw flow event containing the intercepted request data
 - `processedFlow`: flow event after rule evaluation, including a list of rule evaluation results

 **Condition**
 A single test applied to a part of a request flow. A Condition has:
 - `extractor`: the source and path to extract (e.g., `query.userId`)
 - `type`: the kind of test (e.g., `exists`, `equals`, `regex`, `in`, `uuid`)
 - `value`: expected value for comparison (if applicable)

 **Dependency**
 A named relationship between a Rule and a Dimension, indicating that a Rule
 requires certain dimensions to be computed. Represented as:
 - `key`: the Dimension key
 - `required`: boolean indicating if the dimension is mandatory

 **Dimension**
 A reusable data point extracted from a flow, defined and stored in the database. A Dimension has:
 - `key`: unique identifier (e.g., header name or query param)
 - `description`: human-readable explanation
 - `operator`: comparison operator (e.g., regex, equals)
 - `expected`: expected value or pattern
 - `pass_msg` / `fail_msg`: messages to display on evaluation success or failure