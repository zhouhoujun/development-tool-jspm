# packaged jspm-bundle-builder

This repo is for distribution on `npm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun/jspm-bundle-builder/src/mastert).
Please file issues and pull requests against that repo.
This package use to bundle jspm project by custom group. 

## Install

You can install this package either with `npm` or with `jspm`.

### npm

```shell
dependencies: {
  "jspm-bundle-builder": "https://github.com/zhouhoujun/jspm-bundle-builder.git#commit-ish"
}
npm install
```

You can `import` modules:

```js

import  { JSPMBuilder } from 'jspm-bundle-builder';

builder = new JSPMBuilder(options);
//bundle all ,setting in options.
builder.bundle();
//only bundle group1, setting in options .
builder.bundle('group1');
//bundle 'group1','group2','group2', setting in options .
builder.bundle(['group1','group2','group2'])

```

### jspm

```shell
jspm install github:zhouhoujun/jspm-bundle-builder
```
https://github.com/zhouhoujun/jspm-bundle-builder.git
The mocks are then available at `jspm_components/jspm-bundle-builder/jspm-bundle-builder.js`.

## Documentation

Documentation is available on the
[jspm-bundle-builder docs site](https://github.com/zhouhoujun/jspm-bundle-builder).

## License

MIT © [Houjun](https://github.com/zhouhoujun/)