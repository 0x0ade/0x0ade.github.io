---
layout: page
---

- Add `client` field to posts, associating the post with a client identifier. F.e. `"rotonde"`, `"fritter"`.
  - For past messages not containing a "client" field, assume that the client is matching.
  - The client can store its version in the ID, but it's the client's responsibility to handle it. F.e. ClientA will handle `"clientb-1.0.0"` and `"clientb-1.0.1"` as two completely separate clients. Likewise, ClientB will handle `"clienta:1337"` and `"clienta:1338"` as two separate clients. ClientA will read the version number from `clienta:` clients and ClientB will read the version number from `clientb-` IDs, though
- Add optional `visibility` field, allowing the strings `"public"` (default if none given), `"whisper"` or `"client"`
  - `"public"`: The post will be rendered in your feed.
  - `"whisper"`: The post will only be rendered in your feed if:
    - You're the author of the post;
    - Your archive URL is listed in the array stored under `target`.
    - Note: "private" would be a lie, as the post itself is publicly shared, just not publicly rendered.
  - `"client"`: The client automatically generated this post, f.e. "followed Person". The post will only be rendered by a compatible client. The client will gather the information as for how (or if) to render the post from any non-standard properties (f.e. `action: "follow"`). Clients will handle future non-standard vs standard property conflicts on their own, on a case-by-case basis.