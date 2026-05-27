# Tecknar
Tecknar ([the Swedish present indicative for "to draw"](https://en.wiktionary.org/wiki/teckna#Swedish)) is a simple, embeddable drawing program for whatever website you're running. It is currently in a testing phase.

[![GitHub Sponsor](https://img.shields.io/github/sponsors/aadenboy?label=Sponsor&logo=GitHub&color=c9e)](https://github.com/sponsors/aadenboy)

![A screenshot of Tecknar's interface with a drawing shown.](tecknar.png)

Try it out for yourself at https://aadenboy.github.io/tecknar/!

## Installation
Include all files found in the `src/` directory in your project. Then, in any script:

```js
const canvas = new Tecknar();
canvas.mount(object);
```

You can export the data from the canvas at any time either by using `Tecknar.export()` and accessing the `data` property of the object.

View [the wiki](https://github.com/aadenboy/tecknar/wiki) for more information.

## License
Bootstrap Icons is from https://github.com/twbs/icons, and is under the MIT license.

pako.js is from https://github.com/nodeca/pako, and is under the MIT license.

jscolorpicker is from https://github.com/wipeautcrafter/jscolorpicker, and is under the MIT license.

Tecknar itself is under the MIT license.
