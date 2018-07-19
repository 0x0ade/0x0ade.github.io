---
layout: post
title: "Rotonde's \"framework\" mess"
date: 2018-07-18 23:30 +0100
---

> `In reply to `[`Jim Pick/0jjrhr3p3 on Fritter`](dat://fritter.hashbase.io/thread/dat://c6740b08b319265079ebb9da98ee11a01da5d5379ca5d0ef12fa539403532372/posts/0jjrhr3p3.json)

Honestly, I really miss the framework-free days of Rotonde, but frameworks / helpers are needed for a few things:


## Dependencies

### Past

Rotonde has shipped with its own lightweight dependency loader / bootstrapper.

### Present

I haven't read much into ES6 modules.

~~For the time being, I'm repurposing my "lazyman" dependency loader from another project, which in itself is heavily inspired by Rotonde's old "dependency loader".~~

>`Update: 2018-07-19`

Rotonde is shipping its own miniature dependency loader again.

### Future

~~I actually planned on replacing it with something similar to Rotonde's old "deps installer". Migrating to ES6 modules would be even better.~~

>`Update: 2018-07-19`

Migrating to ES6 modules would be great.

## DOM

### Past

Rotonde has initially updated `innerHTML` every time _anything_ had to be rendered, which ended up causing too many DOM-related issues. Among many other things, loss of element states and unwanted layout recalculations / repaints.

Back in the day, I hacked together a mini-framework called "rdom", which was responsible for maintaining ordered lists without updating unrelated elements. It was still a DOM-refreshing innerHTML-based mess, though.

### Present

I recently rewrote it from scratch for another project of mine, now instead focusing on efficiently re-rendering elements however possible.

Render the template once per instance, then `.rdomSet({...})` any "fields" to update them afterwards. Manual updates. No virtual DOM, no DOM diffing, full control. Abuse HTMLElements to hold rdom properties.

### Future

Using framework-less vanilla JS to manipulate the DOM was an "interesting" experience, but at scale, helpers of any kind are unavoidable.

Meanwhile, RDOM grew and grew without any stop in sight. I've recently cut away some slack from it, but at this point, I'd rather use something else than rdom.

Unfortunately, I haven't heard of it until after I began working on rotonde-neu, but the Polymer team is working on something similar: A focused HTML template helper called [lit-html](https://github.com/Polymer/lit-html), focused on efficient re-renders. ~~I'm thinking about switching to it in the next few days.~~ It's still in development, and it's unclear to me whether rendering the same template twice updates the existing instance's holes, or if it creates an entirely new instance - and how updating the holes would work in that case. The `render` function doesn't even return the resulting `HTMLElement`.


## DB

### Past

This was a non-issue for early Rotonde, as we held all records in a single `portal.json`, which didn't require any helpers or frameworks.

My initial plan when migrating to Fritter's format was to use WebDB, but that fell through once a build step got involved. Instead, I wrote a Rotonde-cut replacement called RotonDB.

### Present

RotonDB is still holding up to this day, and the IndexedDB-backed cache is great... but I miss the days of being able to directly access all entries without a middle-man.

### Future

Similarly to rdom, some slack could be cut away, but it already weighs about as much as WebDB itself (without dependencies).


## JSON-LZ

### Past

Similarly to [#DB](#DB), this was a non-issue for early Rotonde.

Back in January this year, during the discussion of the [Beaker browser issue 820 ("Application data schemas & how to manage decentralized development")](https://github.com/beakerbrowser/beaker/issues/820), Paul Frazee proposed JSON-LZ as a solution for exposing which features are supported / used by a given record.

### Present

AFAIK Fritter still isn't supporting JLZ. jlz-mini is relatively lightweight though (6597b, or 1781b uglified), and it's used in the DB definitions (right now only to detect incompatible records).

### Future

A proper solution would require the above discussion to finally find a solution... but the discussion has halted for quite a while now.
