<p align="center">
    <img width="300" src="https://sf16-sg.tiktokcdn.com/obj/eden-sg/lpqulynulog/Magic/logo.qW4rU0mH6aL8.svg">
</p>

<h1 align="center">Magic Portal</h1>

<div align="center">

Make micro-components and micro-frontends never that easy again.

[![GitHub](https://img.shields.io/github/license/bytedance/magic-microservices?color=blue)](https://github.com/bytedance/magic-microservices/blob/main/LICENSE)


</div>


## Overview

A lightweight micro-frontend  / micro-component solution inspired by [Portals](https://github.com/WICG/portals) proposal


## Feature

- ⚡ Blazing fast, based on [magic](https://github.com/bytedance/magic-microservices)
- 🚀 Portability: write your code and use it with any frameworks.
- 🔨 Adaptable: an adapter for any JS module, friendly to existing code.
- 💪 Web Components driven design

## Quick Start

### Installation

```bash
$ npm install @magic-microservices/portal
# or
$ yarn add @magic-microservices/portal
```


### Register portal component

```typescript
import portal, { PortalHtmlEntryPlugin } from '@magic-microservices/portal'

await portal({
  plugins: [new PortalHtmlEntryPlugin()], // fetch and parse html
})
```

### Use built-in portal component 🎉

Registration should be placed before instantiation. Portal html entry plugin uses fetch under the hood, 
make sure the corresponding website's CORS has configured.

```html
<magic-portal src='//some-where-you-want-to-go' />
```

## Inspired by

Magic-portal is inspired by [Portals](https://github.com/WICG/portals) proposal, thanks!