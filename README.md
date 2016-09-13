# packaged jspm-incremental-bundler

This repo is for distribution on `npm` and `jspm`. The source for this module is in the
[main repo](https://github.com/zhouhoujun//jspm-incremental-bundler/src/mastert).
Please file issues and pull requests against that repo.

## Install

You can install this package either with `npm` or with `jspm`.

### npm

```shell
dependencies: {
  "jspm-incremental-bundler": "https://github.com/zhouhoujun/jspm-incremental-bundler.git#commit-ish"
}
npm install
```

You can `import` ngMock modules:

```js

import  { JSPMBuilder } from 'jspm-incremental-bundler';


```

### jspm

```shell
jspm install github:zhouhoujun/jspm-incremental-bundler
```
https://github.com/zhouhoujun//jspm-incremental-bundler.git
The mocks are then available at `jspm_components/jspm-incremental-bundler/jspm-incremental-bundler.js`.

## Documentation

Documentation is available on the
[jspm-incremental-bundler docs site](https://github.com/zhouhoujun//jspm-incremental-bundler).

## License

The MIT License

Copyright (c) 2010-2015 Google, Inc. http://www.skspruce.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
