"use strict";

class Tecknar { // means "drawing" in Swedish :P
  /*
    settings (object): a set of settings for the canvas
      - width (int): the initial width of the canvas (default 250)
      - height (int): the initial height of the canvas (default 200)
      - maxLayers (int): the maximum number of layers (default 256)
      - maxBrushSize (int): the maximum brush size (default 50)
      - minWidth (int): the minimum width of the canvas (default 1)
      - minHeight (int): the minimum height of the canvas (default 1)
      - maxWidth (int): the maximum width of the canvas (default 10000)
      - maxHeight (int): the maximum height of the canvas (default 10000)
      - maxUndo (int): the maximum number of undo states (default Infinity)
        > if memory is a concern, you may want to limit this, otherwise I don't think it really matters?
        * note: clearing and importing add to the undo stack rather than replacing it
      - keybinds (object): a list of keybinds to use. chord multiple keys with a plus sign. ctrl also responds to cmd
        - pen: pen tool (default "p")
        - line: line tool (default "l")
        - rect: rectangle tool (default "r")
        - circle: circle tool (default "o")
        - fill: fill toggle (default "f")
        - erase: erase toggle (default "e")
        - swapColors: swap colors (default "x")
        - linkColors: link colors (default "shift+x")
        - undo: undo (default "ctrl+z")
        - redo: redo (default "ctrl+shift+z")
        - clear: clear (default "ctrl+shift+c")
        - save: save (default "ctrl+s")
        - import: import (default "ctrl+v")
          > uses clipboard
        - export: export (default "ctrl+c")
          > uses clipboard
        - resize: resize (default "ctrl+shift+r")
        - addLayer: add layer (default "ctrl+l")
        - removeLayer: remove layer (default "ctrl+backspace")
        - layerUp: move layer up (default "ctrl+up")
        - layerDown: move layer down (default "ctrl+down")
        - toggleLayer: toggle layer visibility (default "ctrl+shift+v")
        - selectNext: select next layer (default "ctrl+]")
        - selectPrevious: select previous layer (default "ctrl+[")
        - groupLayer: group layer (default "ctrl+g")
        - ungroupLayer: ungroup layer (default "ctrl+shift+g")
          > this applies to the parent group if there is one
      - useDouglasPeucker (boolean): whether to use the Douglas-Peucker algorithm (default true)
        > this is used to simplify strokes for better compression, but may be disabled if you want to keep the original points
      - dpDelta (float): the delta for the Douglas-Peucker algorithm (default 0.5)
        > this is the maximum distance a point can be from the line between two points to be considered a vertex
        > 0.5 is entirely arbitrary (half of a pixel in this case)
      - compressionLevel (0-9): the compression level for the canvas (default 6)
        > this directly corresponds to zlib compression levels. 0 is no compression, 9 is maximum compression
        > 6 is the default used by pako
    options (object): a set of which options to enable
      - tools (boolean/object): tools to enable, or a boolean to specify all or none (default true)
        - pen: enable pen tool (default true)
        - line: enable line tool (default true)
        - rect: enable rectangle tool (default true)
        - circle: enable circle tool (default true)
      - toggles (boolean/object): toggles to enable, or a boolean to specify all or none (default true)
        - fill: enable fill toggle (default true)
        - erase: enable erase toggle (default true)
      - colors: (boolean/object): color pickers to enable, or a boolean to specify all or none (default true)
        - brush: enable brush color picker (default true)
        - fill: enable fill color picker (default true)
          * note: this only applies if fill is enabled. if disabled, fill uses the brush color
          > for ux reasons this is disabled if brush color is disabled
      - layers (boolean): enable layer layers (default true)
      - layerOptions (boolean/object): layer options to enable, or a boolean to specify all or none (default true)
        * note: this only applies if layers is enabled
        * note: disabling layer options also disables layer groups
        - name: enable layer name (default true)
        - opacity: enable layer opacity (default true)
        - blend: enable layer blending modes (default true)
      - clear (boolean): enable clear button (default true)
        > might not be the best idea to disable this
      - history (boolean): enable undo/redo (default true)
      - brushSize (boolean): enable brush size slider (default true)
      - brushOpacity (boolean): enable brush opacity slider (default true)
        * note: this only applies if brushColor is enabled
        > this controls the entire opacity of the stroke itself rather than the colors
        > color opacity allows the stroke and fill color to overlap each other, while brush opacity groups them together
      - save (boolean): enable save button (default true)
        > it may be handy to enable this!
      - saveTKA (boolean): enable saving as a .tka file (default true)
        * note: this only applies if save is enabled
      - saveJSON (boolean): enable saving as a .json file (default true)
        * note: this only applies if save is enabled
      - porting (boolean): enable import and export buttons (default true)
        > it may be handy to enable this!
      - resize (boolean): enable resizing (default true)
  */
  constructor(settings, options) {
    if (settings && typeof settings != "object") throw new Error("Tecknar() expected an object for settings, got " + typeof settings + ".");
    if (options && typeof options != "object") throw new Error("Tecknar() expected an object for options, got " + typeof options + ".");
    settings ??= {};
    options ??= {};
    // base
    this.settings = {
      width: 250,
      height: 200,
      maxLayers: 256,
      maxBrushSize: 50,
      minWidth: 1,
      minHeight: 1,
      maxWidth: 10000,
      maxHeight: 10000,
      maxUndo: Infinity,
      useDouglasPeucker: true,
      dpDelta: 0.5,
      compressionLevel: 6,
      ...settings,
      keybinds: {
        pen: "p",
        line: "l",
        rect: "r",
        circle: "o",
        fill: "f",
        erase: "e",
        swapColors: "x",
        linkColors: "shift+x",
        undo: "ctrl+z",
        redo: "ctrl+shift+z",
        clear: "ctrl+shift+c",
        save: "ctrl+s",
        import: "ctrl+v",
        export: "ctrl+c",
        resize: "ctrl+shift+r",
        addLayer: "ctrl+l",
        removeLayer: "ctrl+backspace",
        layerUp: "ctrl+up",
        layerDown: "ctrl+down",
        toggleLayer: "ctrl+shift+v",
        selectNext: "ctrl+]",
        selectPrevious: "ctrl+[",
        groupLayer: "ctrl+g",
        ungroupLayer: "ctrl+shift+g",
        ...(settings.keybinds ?? {})
      },
      options: {
        tools: true,
        toggles: true,
        colors: true,
        layers: true,
        layerOptions: true,
        clear: true,
        history: true,
        brushSize: true,
        brushColor: true,
        brushOpacity: true,
        save: true,
        saveTKA: true,
        saveJSON: true,
        porting: true,
        resize: true,
        ...options
      }
    };

    // state
    this.layers = [{opacity: 1, blending: 0, strokes: [], visible: true}];
    this.layerPointer = 0;
    this.layerTreeCache = null;
    this.layerTreeMutated = true; // whether the tree has been mutated since the last cache
    this.undoStack = [];
    this.undoPointer = -1;
    this.brush = {
      type: "pen",
      size: 10,
      color: "#000000",
      fillColor: "#000000",
      linkedColors: false,
      opacity: 1,
      fill: false,
      erase: false,
      isDrawing: false,
      shiftHeld: false,
      ctrlHeld: false
    };
    this.viewportZoom = 1;
    this.data = ""; // filled later
    this.blendModeNames = [
      "source-over", // normal
      "source-in",
      "source-out",
      "source-atop",
      "destination-over",
      "destination-in",
      "destination-out",
      "destination-atop",
      "lighter",
      "copy",
      "xor",
      "multiply",
      "screen",
      "overlay",
      "darken",
      "lighten",
      "color-dodge",
      "color-burn",
      "hard-light",
      "soft-light",
      "difference",
      "exclusion",
      "hue",
      "saturation",
      "color",
      "luminosity",
    ];
    
    // DOM
    this.container = document.createElement("div");
    this.container.classList.add("tecknar-container");
    this.containerMiddle = document.createElement("div");
    this.containerMiddle.classList.add("tecknar-container-middle");

    this.canvasContainer = document.createElement("div");
    this.canvasContainer.classList.add("tecknar-canvas-container");
    this.canvas = document.createElement("canvas");
    this.canvas.tabIndex = 0;
    this.canvasContainer.appendChild(this.canvas);
    this.canvas.width = this.settings.width;
    this.canvas.height = this.settings.height;
    this.canvas.classList.add("tecknar-canvas");
    this.canvas.setAttribute("aria-label", "Tecknar canvas");
    this.canvas.setAttribute("role", "img");
    this.canvas.setAttribute("tabindex", "0");
    this.ctx = this.canvas.getContext("2d");
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.opacityCanvas = new OffscreenCanvas(this.settings.width, this.settings.height); // for opacity of a single stroke
    this.opacityCtx = this.opacityCanvas.getContext("2d");
    this.opacityCtx.lineCap = "round";
    this.opacityCtx.lineJoin = "round";
    this.liveOpacityCanvas = new OffscreenCanvas(this.settings.width, this.settings.height); // specifically for live strokes
    this.liveOpacityCtx = this.liveOpacityCanvas.getContext("2d");
    this.liveOpacityCtx.lineCap = "round";
    this.liveOpacityCtx.lineJoin = "round";

    this.toolbar = document.createElement("ul");
    this.toolbar.classList.add("tecknar-toolbar");
    this.toolbar.setAttribute("role", "toolbar");
    
    this.penTool = this.#quickTool("pencil", "pen");
    this.penTool.checked = true;
    this.penTool.parentNode.classList.add("tecknar-tool-active");
    this.penTool.addEventListener("change", () => this.brush.type = "pen");
    this.lineTool = this.#quickTool("slash-lg", "line");
    this.lineTool.addEventListener("change", () => this.brush.type = "line");
    this.rectTool = this.#quickTool("square", "rect");
    this.rectTool.addEventListener("change", () => this.brush.type = "rect");
    this.circleTool = this.#quickTool("circle", "circle");
    this.circleTool.addEventListener("change", () => this.brush.type = "circle");
    this.fillToggle = this.#quickTool("paint-bucket", "fill");
    this.fillToggle.name = "tecknar-toggle";
    this.fillToggle.type = "checkbox";
    this.fillToggle.parentNode.setAttribute("aria-label", "fill mode");
    this.fillToggle.addEventListener("change", () => this.brush.fill = this.fillToggle.checked);
    this.eraseToggle = this.#quickTool("eraser", "erase");
    this.eraseToggle.name = "tecknar-toggle";
    this.eraseToggle.type = "checkbox";
    this.eraseToggle.parentNode.setAttribute("aria-label", "erase mode");
    this.eraseToggle.addEventListener("change", () => this.brush.erase = this.eraseToggle.checked);

    this.topbar = document.createElement("div");
    this.topbar.classList.add("tecknar-topbar");
    this.topbar.setAttribute("role", "toolbar");
    this.brushSize = this.#quickInput("range", "brush-size", 10, false, "Brush size");
    this.brushSize.min = 1;
    this.brushSize.max = this.settings.maxBrushSize;
    this.brushSize.parentNode.classList.add("tecknar-brush-size");
    this.brushSize.addEventListener("input", () => this.brush.size = this.brushSize.value);
    this.topbar.appendChild(this.brushSize.parentNode);
    this.brushColor = this.#quickInput("color", "brush-color", "#000000", false, "Brush");
    this.brushColorPicker = new ColorPicker(this.brushColor, {toggleStyle: "button", submitMode: "instant", dialogPlacement: "right"});
    this.brushColor.addEventListener("change", () => {
      this.brush.color = this.brushColor.value;
      if (this.brush.linkedColors) {
        this.brush.fillColor = this.brushColor.value
        this.refreshTopbar();
      };
    });
    this.brushColor.parentNode.classList.add("tecknar-brush-color");
    this.fillColor = this.#quickInput("color", "fill-color", "#000000", false, "Fill");
    this.fillColorPicker = new ColorPicker(this.fillColor, {toggleStyle: "button", submitMode: "instant", dialogPlacement: "right"});
    this.fillColor.addEventListener("change", () => {
      this.brush.fillColor = this.fillColor.value;
      if (this.brush.linkedColors) {
        this.brushColor.value = this.fillColor.value
        this.refreshTopbar();
      };
    });
    this.fillColor.parentNode.classList.add("tecknar-fill-color");
    this.swapColors = this.#quickButton(null, "arrow-left-right", () => {
      [this.brush.color, this.brush.fillColor] = [this.brush.fillColor, this.brush.color];
      this.refreshTopbar();
    })
    this.swapColors.classList.add("tecknar-swap-colors");
    this.swapColors.setAttribute("aria-label", "Swap colors");
    this.linkedColors = this.#quickInput("checkbox", "linked-colors", false, false, "Link colors");
    this.linkedColors.addEventListener("change", () => {this.brush.linkedColors = this.linkedColors.checked; this.refreshTopbar();});
    this.linkedColors.parentNode.classList.add("tecknar-linked-colors");
    this.brushOpacity = this.#quickInput("range", "brush-opacity", 100, false, "Brush opacity");
    this.brushOpacity.min = 0;
    this.brushOpacity.max = 100;
    this.brushOpacity.step = 1;
    this.brushOpacity.parentNode.classList.add("tecknar-brush-opacity");
    this.brushOpacity.addEventListener("input", () => this.brush.opacity = this.brushOpacity.value / 100);
    this.undoButton = this.#quickButton(null, "arrow-counterclockwise", () => this.undo());
    this.undoButton.classList.add("tecknar-undo");
    this.undoButton.setAttribute("aria-label", "Undo");
    this.redoButton = this.#quickButton(null, "arrow-clockwise", () => this.redo());
    this.redoButton.classList.add("tecknar-redo");
    this.redoButton.setAttribute("aria-label", "Redo");
    this.topbar.append(this.brushSize.parentNode, this.brushOpacity.parentNode, this.brushColor.parentNode.parentNode, this.swapColors, this.fillColor.parentNode.parentNode, this.linkedColors.parentNode, this.undoButton, this.redoButton)

    this.canvasbar = document.createElement("div");
    this.canvasbar.classList.add("tecknar-canvasbar");
    this.canvasScale = this.#quickInput("range", "canvas-scale", 100, false, "Canvas scale", true); // actually for the size of the element itself
    this.canvasScale.min = 0;
    this.canvasScale.max = 100;
    this.canvasScale.step = 1;
    this.canvasScale.parentNode.classList.add("tecknar-canvas-scale");
    this.canvasScale.addEventListener("input", () => {
      this.canvas.style.width = this.settings.width * this.canvasScale.value / 100 + "px";
      this.canvas.style.height = this.settings.height * this.canvasScale.value / 100 + "px";
    });
    this.zoomIn = this.#quickButton(null, "zoom-in", () => {
      this.viewportZoom *= 1.1;
      this.viewportZoom = Math.min(this.viewportZoom, 10);
      this.repositionCanvas();
    });
    this.zoomIn.classList.add("tecknar-zoom-in");
    this.zoomIn.setAttribute("aria-label", "Zoom in");
    this.zoomOut = this.#quickButton(null, "zoom-out", () => {
      this.viewportZoom /= 1.1;
      this.viewportZoom = Math.max(this.viewportZoom, 1);
      this.repositionCanvas();
    });
    this.zoomOut.classList.add("tecknar-zoom-out");
    this.zoomOut.setAttribute("aria-label", "Zoom out");
    this.canvasbar.append(this.canvasScale.parentNode);//, this.zoomIn, this.zoomOut); // zoom has weird scaling artifacts. dunno wtf is with it
    
    this.layerbar = document.createElement("div"); // contains both
    this.layerbar.classList.add("tecknar-layerbar");
    this.layerListContainer = document.createElement("div");
    this.layerListContainer.classList.add("tecknar-layer-list-container");
    this.layerList = document.createElement("ul");
    this.layerList.classList.add("tecknar-layer-list");
    this.layerList.setAttribute("role", "listbox");
    
    this.layerControls = document.createElement("div"); // quick actions
    this.layerControls.classList.add("tecknar-layer-controls");
    this.addLayerButton = this.#quickButton(null, "plus-lg", () => this.addLayer());
    this.addLayerButton.classList.add("tecknar-add-layer");
    this.layerUpButton = this.#quickButton(null, "arrow-bar-up", () => this.layerUp());
    this.layerUpButton.classList.add("tecknar-layer-up");
    this.layerDownButton = this.#quickButton(null, "arrow-bar-down", () => this.layerDown());
    this.layerDownButton.classList.add("tecknar-layer-down");
    this.removeLayerButton = this.#quickButton(null, "trash3", () => this.removeLayer());
    this.removeLayerButton.classList.add("tecknar-remove-layer");
    this.groupLayerButton = this.#quickButton(null, "folder-plus", () => this.groupLayer());
    this.groupLayerButton.classList.add("tecknar-group-layer");
    this.ungroupLayerButton = this.#quickButton(null, "folder-minus", () => this.ungroupLayer());
    this.ungroupLayerButton.classList.add("tecknar-ungroup-layer");
    this.layerControls.append(this.addLayerButton, this.layerUpButton, this.layerDownButton, this.removeLayerButton, this.groupLayerButton, this.ungroupLayerButton);
    this.layerListContainer.append(this.layerControls, this.layerList);
    
    this.layerOptions = document.createElement("div"); // specific settings
    this.layerOptions.classList.add("tecknar-layer-options");
    this.layerName = this.#quickInput("text", "layer-name", "", false, "Layer name", true);
    this.layerName.classList.add("tecknar-layer-name");
    this.layerName.placeholder = "Layer #";
    this.layerName.maxLength = 255;
    this.layerName.addEventListener("input", () => this.setLayerValue("name", this.layerName.value));
    this.layerOpacity = this.#quickInput("number", "layer-opacity", 100, false, "Opacity", true);
    this.layerOpacity.classList.add("tecknar-layer-opacity");
    this.layerOpacity.min = 0;
    this.layerOpacity.max = 100;
    this.layerOpacity.step = 1;
    this.layerOpacity.addEventListener("input", () => this.setLayerValue("opacity", this.layerOpacity.value / 100));
    this.layerBlendContainer = document.createElement("label");
    this.layerBlendContainer.innerHTML = "Blend mode";
    this.layerBlend = document.createElement("select");
    this.layerBlend.classList.add("tecknar-layer-blend");
    for (let i = 0; i < this.blendModeNames.length; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.innerHTML = this.blendModeNames[i];
      this.layerBlend.appendChild(option);
    }
    this.layerPassthrough = document.createElement("option");
    this.layerPassthrough.value = 255;
    this.layerPassthrough.innerHTML = "passthrough";
    this.layerBlend.value = 0;
    this.layerBlend.children[0].innerHTML = "normal";
    this.layerBlend.addEventListener("input", () => this.setLayerValue("blending", this.layerBlend.value));
    this.layerBlendContainer.appendChild(this.layerBlend);
    this.layerOptions.append(this.layerName.parentNode, this.layerOpacity.parentNode, this.layerBlendContainer);
    this.layerbar.append(this.layerListContainer, this.layerOptions)

    this.bottomgroup = document.createElement("div");
    this.bottomgroup.classList.add("tecknar-bottomgroup");
    this.bottombar = document.createElement("div");
    this.bottombar.classList.add("tecknar-bottombar");
    this.saveButton = this.#quickButton("Save");
    this.saveButton.classList.add("tecknar-save");
    this.importFile = this.#quickInput("file", "import-file", "", false, "Import file", true);
    this.importFile.accept = ".tka,.json";
    this.importFile.parentNode.classList.add("tecknar-import-file");
    this.importButton = this.#quickButton("Import clipboard", null, () => {
      navigator.clipboard.readText().then((text) => this.import(text));
    });
    this.importButton.classList.add("tecknar-import");
    this.exportButton = this.#quickButton("Export", null, () => {
      navigator.clipboard.writeText(this.export().data);
    });
    this.exportButton.classList.add("tecknar-export");
    this.clearButton = this.#quickButton("Clear", null, () => this.clear());
    this.clearButton.classList.add("tecknar-clear");
    this.canvasWidth = this.#quickInput("number", "canvas-width", 250, false, "Width", true);
    this.canvasWidth.classList.add("tecknar-canvas-width");
    this.canvasWidth.min = this.settings.minWidth;
    this.canvasWidth.max = this.settings.maxWidth;
    this.canvasWidth.step = 1;
    this.canvasWidth.addEventListener("change", () => this.canvasWidth.value = Math.min(Math.max(this.canvasWidth.value, this.settings.minWidth), this.settings.maxWidth));
    this.canvasHeight = this.#quickInput("number", "canvas-height", 200, false, "Height", true);
    this.canvasHeight.classList.add("tecknar-canvas-height");
    this.canvasHeight.min = this.settings.minHeight;
    this.canvasHeight.max = this.settings.maxHeight;
    this.canvasHeight.step = 1;
    this.canvasHeight.addEventListener("change", () => this.canvasHeight.value = Math.min(Math.max(this.canvasHeight.value, this.settings.minHeight), this.settings.maxHeight));
    this.resizeButton = this.#quickButton("Resize", null, () => {
      const prevwidth = this.settings.width;
      const prevheight = this.settings.height;
      this.state(
        () => {
          this.settings.width = prevwidth;
          this.settings.height = prevheight;
          this.refreshCanvas();
        },
        () => {
          this.settings.width = this.canvasWidth.value;
          this.settings.height = this.canvasHeight.value;
          this.refreshCanvas();
        }
      )
    });
    this.resizeButton.classList.add("tecknar-resize");
    this.bottombar.append(this.saveButton, this.importFile.parentNode, this.importButton, this.exportButton, this.clearButton, this.canvasWidth.parentNode, this.canvasHeight.parentNode, this.resizeButton);

    this.link = document.createElement("a");
    this.link.href = "https://github.com/aadenboy/tecknar";
    this.link.target = "_blank";
    this.link.innerHTML = " GitHub";
    this.link.classList.add("bi", "bi-github");
    this.bottombar.appendChild(this.link);
    
    this.containerMiddle.append(this.toolbar, this.canvasContainer, this.layerbar);
    this.container.append(this.topbar, this.canvasbar, this.containerMiddle, this.bottombar);

    this.saveModal = document.createElement("dialog");
    this.saveModal.classList.add("tecknar-save-modal");
    this.saveButton.addEventListener("click", () => this.saveModal.showModal());
    this.saveClose = this.#quickButton(null, "x-lg", () => this.saveModal.close());
    this.saveClose.classList.add("tecknar-save-close");
    this.saveClose.setAttribute("aria-label", "Close");
    this.saveModal.appendChild(this.saveClose);
    this.saveName = this.#quickInput("text", "save-name", "", false, "Save as:", true);
    this.saveName.parentNode.classList.add("tecknar-save-name");
    this.saveFormatsContainer = document.createElement("label");
    this.saveFormatsContainer.innerHTML = "Format: ";
    this.saveFormats = document.createElement("select");
    const formats = [
      ".png",
      ".jpg",
      ".webp"
    ];
    for (let format of formats) {
      const option = document.createElement("option");
      option.value = format;
      option.innerHTML = format;
      this.saveFormats.appendChild(option);
    }
    this.saveTKA = document.createElement("option");
    this.saveTKA.value = ".tka";
    this.saveTKA.innerHTML = ".tka";
    this.saveJSON = document.createElement("option");
    this.saveJSON.value = ".json";
    this.saveJSON.innerHTML = ".json";
    this.saveFormats.value = ".png";
    this.saveFormatsContainer.appendChild(this.saveFormats);
    this.saveFormatsContainer.classList.add("tecknar-save-formats");
    this.saveConfirm = this.#quickButton("Save", null, () => {
      const format = this.saveFormats.value;
      const name = this.saveName.value || ("Drawing " + new Date().toISOString().slice(0, 10));
      const link = document.createElement("a");
      if (format == ".tka") {
        const {compressed} = this.export(); // no base64 :)
        let data = "4o:";
        for (let i = 0; i < compressed.length; i++) {
          data += String.fromCharCode(compressed[i]);
        }
        console.log(data);
        link.download = name + format;
        link.href = "data:application/octet-stream," + encodeURIComponent(data);
      } else if (format == ".json") {
        const object = {width: this.settings.width, height: this.settings.height, layers: this.layers}
        link.download = name + format;
        link.href = "data:application/json," + encodeURIComponent(JSON.stringify(object));
      } else {
        const link = document.createElement("a");
        link.download = name + format;
        link.href = this.canvas.toDataURL("image/" + format.slice(1));
      }
      link.click();
      this.saveModal.close();
    });
    this.importFile.addEventListener("change", () => {
      const file = this.importFile.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log(e);
        if (file.name.endsWith(".tka")) {
          let string = e.target.result;
          let [_, version, params, binary] = (string.match(/^(\d+)([a-z]*):(.+)/s) ?? [null, "1", "", string])
          let data = version + params + ":" + btoa(binary);
          console.log(0, version, params, binary, data);
          this.import(data);
        } else if (file.name.endsWith(".json")) {
          const object = JSON.parse(e.target.result);
          this.settings.width = object.width;
          this.settings.height = object.height;
          this.layers = object.layers;
          this.layers.forEach((layer) => {
            layer.cache = null;
            layer.cacheCtx = null;
            layer.workingCanvas = null;
            layer.workingCtx = null;
          });
          this.refreshCanvas();
          this.refreshLayerbar();
        }
      };
      reader.readAsText(file);
    })
    this.saveConfirm.classList.add("tecknar-save-confirm");
    this.saveModal.append(this.saveName.parentNode, this.saveFormats.parentNode, this.saveConfirm);
    this.container.appendChild(this.saveModal);
    
    
    this.state(() => {});
    this.undoButton.disabled = true;
    this.refresh();

    this.container.setAttribute("tabindex", 0);
    this.container.addEventListener("keydown", (e) => this.keyDown(e));
    this.container.addEventListener("keyup", (e) => this.keyUp(e));

    this.canvas.addEventListener("pointerdown", (e) => {this.startStroke(e.offsetX, e.offsetY); e.preventDefault()});
    this.canvas.addEventListener("pointermove", (e) => {this.continueStroke(e.offsetX, e.offsetY); e.preventDefault()});
    document.addEventListener("pointerup", () => this.endStroke());
    this.canvas.addEventListener("pointerenter", (e) => {this.continueStroke(e.offsetX, e.offsetY); e.preventDefault()});
    this.canvas.addEventListener("pointerleave", (e) => {this.continueStroke(e.offsetX, e.offsetY); e.preventDefault()});
  }
  // or just use the container directly
  mount(object) {
    if (!object) throw new Error("Tecknar.mount() requires an object to mount to.");
    if (typeof object == "string") object = document.querySelector(object);
    object.appendChild(this.container);
  }
  // helpers
  // input element
  #quickInput(type, name, value, checked, text, swap) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = type;
    input.name = "tecknar-" + name;
    input.value = value;
    input.checked = checked;
    input.id = "tecknar-" + name + "-" + value;
    if (text && swap) label.appendChild(document.createTextNode(text));
    label.appendChild(input);
    if (text && !swap) label.appendChild(document.createTextNode(text));
    return input;
  }
  // button element
  #quickButton(text, icon, click) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = text;
    if (icon) button.innerHTML = `<i class="bi bi-${icon}"></i>`;
    if (click) button.addEventListener("click", click);
    return button;
  }
  // tool thing
  #quickTool(icon, name) {
    const li = document.createElement("li");
    const input = this.#quickInput("radio", "tool", name, false);
    input.parentNode.classList.add("tecknar-tool");
    input.parentNode.setAttribute("aria-label", name + " tool");
    const i = document.createElement("i");
    i.classList.add("bi", "bi-" + icon);
    input.parentNode.appendChild(i);
    li.appendChild(input.parentNode);
    this.toolbar.appendChild(li);
    return input;
  }
  // https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
  // simplifies a set of points based on perpendicular distance
  #perpdist(x1, y1, x2, y2, x, y) {
    return Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);
  }
  #DouglasPeucker(points, epsilon) {
    epsilon ??= this.settings.dpDelta;
    let dmax = 0;
    let index = 0;
    let end = points.length - 1;
    let endsequal = points[0][0] == points[end][0] && points[0][1] == points[end][1];
    end -= endsequal ? 1 : 0;
    for (let i = 1; i < end; i++) {
      const d = this.#perpdist(points[0][0], points[0][1], points[end][0], points[end][1], points[i][0], points[i][1])
      if (d > dmax) {
        index = i
        dmax = d
      }
    }
    if (dmax > epsilon) {
      const recResults1 = this.#DouglasPeucker(points.slice(0, index + 1), epsilon);
      const recResults2 = this.#DouglasPeucker(points.slice(index), epsilon);
      return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
    }
    end += endsequal ? 1 : 0;
    return [points[0], points[end]];
  }
    
  // methods

  // DOM
  // usually elements self-maintain their state, but these are for when the settings change and other function calls
  // this one removes all of the caches so beware
  refreshCanvas() {
    this.canvas.width = this.settings.width;
    this.canvas.height = this.settings.height;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.canvas.style.width = this.settings.width * this.canvasScale.value / 100 + "px";
    this.canvas.style.height = this.settings.height * this.canvasScale.value / 100 + "px";
    this.repositionCanvas();
    this.canvasContainer.maxWidth = this.canvas.style.width;
    this.canvasContainer.maxHeight = this.canvas.style.height;
    this.opacityCanvas.width = this.settings.width;
    this.opacityCanvas.height = this.settings.height;
    this.opacityCtx.lineCap = "round";
    this.opacityCtx.lineJoin = "round";
    this.liveOpacityCanvas.width = this.settings.width;
    this.liveOpacityCanvas.height = this.settings.height;
    this.liveOpacityCtx.lineCap = "round";
    this.liveOpacityCtx.lineJoin = "round";
    for (let layer of this.layers) {
      layer.cache = null;
    }
    this.layerTreeMutated = true;
    this.redraw();
  }
  refreshToolbar() {
    const options = this.settings.options;
    const toolSettings = typeof options.tools == "object" ? options.tools : {pen: options.tools, line: options.tools, rect: options.tools, circle: options.tools};
    const toggleSettings = typeof options.toggles == "object" ? options.toggles : {fill: options.toggles, erase: options.toggles};
    this.brush.type = toolSettings[this.brush.type] ? this.brush.type : toolSettings.filter(enabled => enabled)[0] ?? "pen";
    this.brush.fill = toggleSettings.fill && this.brush.fill;
    this.brush.erase = toggleSettings.erase && this.brush.erase;
    this.penTool.parentNode.style.display = toolSettings.pen ? "" : "none";
    this.lineTool.parentNode.style.display = toolSettings.line ? "" : "none";
    this.rectTool.parentNode.style.display = toolSettings.rect ? "" : "none";
    this.circleTool.parentNode.style.display = toolSettings.circle ? "" : "none";
    this.fillToggle.parentNode.style.display = toggleSettings.fill ? "" : "none";
    this.eraseToggle.parentNode.style.display = toggleSettings.erase ? "" : "none";
    this.penTool.checked = this.brush.type == "pen";
    this.lineTool.checked = this.brush.type == "line";
    this.rectTool.checked = this.brush.type == "rect";
    this.circleTool.checked = this.brush.type == "circle";
    this.fillToggle.checked = this.brush.fill;
    this.eraseToggle.checked = this.brush.erase;
    this.toolbar.style.display = toolSettings.pen || toolSettings.line || toolSettings.rect || toolSettings.circle || toggleSettings.fill || toggleSettings.erase ? "" : "none";
    this.penTool.title = "Pen (" + this.settings.keybinds.pen + ")";
    this.lineTool.title = "Line (" + this.settings.keybinds.line + ")";
    this.rectTool.title = "Rectangle (" + this.settings.keybinds.rect + ")";
    this.circleTool.title = "Circle (" + this.settings.keybinds.circle + ")";
    this.fillToggle.title = "Fill (" + this.settings.keybinds.fill + ")";
    this.eraseToggle.title = "Erase (" + this.settings.keybinds.erase + ")";
    this.settings.keybinds.penCallback = () => this.penTool.click();
    this.settings.keybinds.lineCallback = toolSettings.line ? () => this.lineTool.click() : null;
    this.settings.keybinds.rectCallback = toolSettings.rect ? () => this.rectTool.click() : null;
    this.settings.keybinds.circleCallback = toolSettings.circle ? () => this.circleTool.click() : null;
    this.settings.keybinds.fillCallback = toggleSettings.fill ? () => this.fillToggle.click() : null;
    this.settings.keybinds.eraseCallback = toggleSettings.erase ? () => this.eraseToggle.click() : null;
  }
  refreshTopbar() {
    const options = this.settings.options;
    const colorSettings = typeof options.colors == "object" ? options.colors : {brush: options.colors, fill: options.colors};
    const toggleSettings = typeof options.toggles == "object" ? options.toggles : {fill: options.toggles, erase: options.toggles};
    this.brushColor.parentNode.style.display = colorSettings.brush ? "" : "none";
    this.fillColor.parentNode.style.display = colorSettings.fill && toggleSettings.fill ? "" : "none";
    this.swapColors.style.display = colorSettings.brush && colorSettings.fill && toggleSettings.fill ? "" : "none";
    this.linkedColors.parentNode.style.display = colorSettings.brush && colorSettings.fill && toggleSettings.fill ? "" : "none";
    this.brush.fillColor = this.brush.linkedColors ? this.brush.color : this.brush.fillColor;
    this.brushColorPicker.setColor(this.brush.color, false);
    this.fillColorPicker.setColor(this.brush.fillColor, false);
    this.brushSize.parentNode.style.display = options.brushSize ? "" : "none";
    this.brushSize.value = this.brush.size;
    this.brushSize.max = this.settings.maxBrushSize;
    this.brushOpacity.parentNode.style.display = options.brushOpacity ? "" : "none";
    this.brushOpacity.value = (this.brush.opacity * 100) || 0;
    this.undoButton.style.display = options.history ? "" : "none";
    this.undoButton.disabled = this.undoPointer == 0;
    this.redoButton.style.display = options.history ? "" : "none";
    this.redoButton.disabled = this.undoPointer == this.undoStack.length - 1;
    this.topbar.style.display = options.brushSize || colorSettings.brush || options.brushOpacity || options.history ? "" : "none";
    this.swapColors.title = "Swap colors (" + this.settings.keybinds.swapColors + ")";
    this.linkedColors.title = "Link colors (" + this.settings.keybinds.linkColors + ")";
    this.undoButton.title = "Undo (" + this.settings.keybinds.undo + ")";
    this.redoButton.title = "Redo (" + this.settings.keybinds.redo + ")";
    this.settings.keybinds.swapColorsCallback = colorSettings.brush && colorSettings.fill && toggleSettings.fill ? () => this.swapColors.click() : null;
    this.settings.keybinds.linkColorsCallback = colorSettings.brush && colorSettings.fill && toggleSettings.fill ? () => this.linkedColors.click() : null;
    this.settings.keybinds.undoCallback = options.history ? () => this.undoButton.click() : null;
    this.settings.keybinds.redoCallback = options.history ? () => this.redoButton.click() : null;
  }
  refreshLayerbar() {
    const options = this.settings.options;
    const layerOptionsSettings = typeof options.layerOptions == "object" ? options.layerOptions : {name: options.layerOptions, opacity: options.layerOptions, blend: options.layerOptions};
    this.layerbar.style.display = options.layers ? "" : "none";
    this.layerName.parentNode.style.display = layerOptionsSettings.name ? "" : "none";
    this.layerName.value = this.getLayer().name ?? "";
    this.layerOpacity.parentNode.style.display = layerOptionsSettings.opacity ? "" : "none";
    this.layerOpacity.value = (this.getLayer().opacity * 100)|0;
    this.layerBlend.style.display = layerOptionsSettings.blend ? "" : "none";
    this.layerBlend.value = this.getLayer().blending;
    this.layerOptions.style.display = layerOptionsSettings.name || layerOptionsSettings.opacity || layerOptionsSettings.blend ? "" : "none";
    this.groupLayerButton.style.display = this.layerOptions.style.display;
    this.ungroupLayerButton.style.display = this.layerOptions.style.display;
    this.layerPassthrough.remove();
    this.addLayerButton.title = "Add layer (" + this.settings.keybinds.addLayer + ")";
    this.removeLayerButton.title = "Remove layer (" + this.settings.keybinds.removeLayer + ")";
    this.layerUpButton.title = "Move layer up (" + this.settings.keybinds.layerUp + ")";
    this.layerDownButton.title = "Move layer down (" + this.settings.keybinds.layerDown + ")";
    this.groupLayerButton.title = "Group layer (" + this.settings.keybinds.groupLayer + ")";
    this.ungroupLayerButton.title = "Ungroup layer(s) (" + this.settings.keybinds.ungroupLayer + ")";
    this.settings.keybinds.addLayerCallback = options.layers ? () => this.addLayerButton.click() : null;
    this.settings.keybinds.removeLayerCallback = options.layers ? () => this.removeLayerButton.click() : null;
    this.settings.keybinds.layerUpCallback = options.layers ? () => this.layerUpButton.click() : null;
    this.settings.keybinds.layerDownCallback = options.layers ? () => this.layerDownButton.click() : null;
    this.settings.keybinds.groupLayerCallback = options.layers ? () => this.groupLayerButton.click() : null;
    this.settings.keybinds.ungroupLayerCallback = options.layers ? () => this.ungroupLayerButton.click() : null;
    this.settings.keybinds.toggleLayerCallback = options.layers ? () => {
      const layer = this.getLayer();
      this.state(
        () => {
          layer.visible = !layer.visible;
          this.refreshLayerbar();
        }
      )
    } : null;
    this.settings.keybinds.selectNextCallback = options.layers ? () => {
      this.layerPointer = Math.min(Math.max(++this.layerPointer, 0, this.layers.length - 1));
      this.refreshLayerbar();
    } : null;
    this.settings.keybinds.selectPreviousCallback = options.layers ? () => {
      this.layerPointer = Math.min(Math.max(--this.layerPointer, 0, this.layers.length - 1));
      this.refreshLayerbar();
    } : null;

    if (!options.layers) return;
    this.layerList.innerHTML = "";
    let currentGroup = this.layerList;
    /*
      ul
        li
          label ...
          ul
            li
              label ...
    */
    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i];
      const type = layer.type ?? "layer";
      const name = type[0].toUpperCase() + type.slice(1);
      if (type == "ungroup") {
        currentGroup = currentGroup.parentNode.parentNode; // ew!
        continue;
      }
      
      const li = document.createElement("li");
      li.classList.add("tecknar-layer-" + type);
      currentGroup.appendChild(li);

      const toggle = this.#quickInput("checkbox", "layer-toggle", i, layer.visible, "");
      toggle.addEventListener("change", () => {
        this.state(
          () => {
            layer.visible = !layer.visible;
            toggle.checked = layer.visible;
            this.redraw();
          },
        )
      });
      toggle.checked = layer.visible;
      toggle.title = "Toggle layer (" + this.settings.keybinds.toggleLayer + ")";
      li.appendChild(toggle.parentNode);
      
      const label = document.createElement("label");
      const input = this.#quickInput("radio", "layer", i, i == this.layerPointer, "");
      label.appendChild(input);
      if (!layer.name) {
        const il = document.createElement("i");
        il.innerHTML = name
        label.appendChild(il);
      } else label.appendChild(document.createTextNode(layer.name));
      input.addEventListener("click", () => {
        this.layerPointer = i;
        this.layerName.value = layer.name ?? "";
        this.layerOpacity.value = (layer.opacity * 100)|0;
        this.layerPassthrough.remove();
        if (type == "group") this.layerBlend.insertBefore(this.layerPassthrough, this.layerBlend.children[1]);
        this.layerBlend.value = layer.blending;
        label.lastChild.remove();
        if (!layer.name) {
          const il = document.createElement("i");
          il.innerHTML = name
          label.appendChild(il);
        } else label.appendChild(document.createTextNode(layer.name));
      });
      li.appendChild(label);
      if (i == this.layerPointer) input.click();

      if (type == "group") {
        const group = document.createElement("ul");
        group.classList.add("tecknar-layer-group");
        li.appendChild(group);
        currentGroup = group;
        const collapseLabel = document.createElement("label");
        const collapse = this.#quickInput("checkbox", "", i, layer.expanded, "");
        collapse.classList.add("tecknar-layer-collapse");
        collapse.name = "";
        const collapseIcon = document.createElement("i");
        collapseIcon.classList.add("bi", "bi-chevron-down");
        collapse.addEventListener("change", () => {
          this.state(
            () => {
              layer.expanded = !layer.expanded;
              collapse.checked = layer.expanded;
              collapseIcon.classList.toggle("bi-chevron-down");
              collapseIcon.classList.toggle("bi-chevron-right");
            }
          )
        });
        collapse.checked = layer.expanded;
        collapseLabel.title = "Fold layer";
        collapseLabel.append(collapse.parentNode, collapseIcon);
        li.insertBefore(collapseLabel, li.firstChild);
      } else if (layer.cache) {
        li.insertBefore(layer.cache, li.firstChild);
      }
    }
  }
  refreshBottombar() {
    const options = this.settings.options;
    this.saveButton.style.display = options.save ? "" : "none";
    const usefile = (options.saveTKA || options.saveJSON) && options.porting && options.save;
    this.importFile.parentNode.style.display = usefile ? "" : "none";
    this.importButton.style.display = options.porting ? "" : "none";
    this.importButton.innerHTML = usefile ? "Import clipboard" : "Import";
    this.exportButton.style.display = options.porting ? "" : "none";
    this.clearButton.style.display = options.clear ? "" : "none";
    this.canvasWidth.parentNode.style.display = options.resize ? "" : "none";
    this.canvasHeight.parentNode.style.display = options.resize ? "" : "none";
    this.resizeButton.style.display = options.resize ? "" : "none";
    this.bottombar.style.display = options.save || options.porting || options.clear || options.resize ? "" : "none";
    this.clearButton.title = "Clear canvas (" + this.settings.keybinds.clear + ")";
    this.saveButton.title = "Save (" + this.settings.keybinds.save + ")";
    this.importButton.title = "Import (" + this.settings.keybinds.import + ")";
    this.exportButton.title = "Export (" + this.settings.keybinds.export + ")";
    this.settings.keybinds.clearCallback = options.clear ? () => this.clearButton.click() : null;
    this.settings.keybinds.saveCallback = options.save ? () => this.saveButton.click() : null;
    this.settings.keybinds.importCallback = options.porting ? () => this.importButton.click() : null;
    this.settings.keybinds.exportCallback = options.porting ? () => this.exportButton.click() : null;
    if (!this.settings.options.saveTKA) this.saveTKA.remove();
    else this.saveFormats.appendChild(this.saveTKA);
    if (!this.settings.options.saveJSON) this.saveJSON.remove();
    else this.saveFormats.appendChild(this.saveJSON);
  }
  repositionCanvas() {
    this.canvas.style.transform = `scale(${this.viewportZoom})`;
  }
  // global refresh
  refresh() {
    this.refreshTopbar();
    this.refreshToolbar();
    this.refreshLayerbar();
    this.refreshBottombar();
    this.repositionCanvas();
  }

  // state methods
  // creates an undo state. unlike the previous canvas, this one doesn't export the canvas and instead uses predefined functions
  // note that state calls the redo function after invoking
  state(undo, redo) {
    if (!undo) throw new Error("Tecknar.state() requires either an undo and redo method, or a method which performs both actions."); // i.e symmetric
    redo ??= undo;
    this.undoPointer++;
    if (this.undoPointer >= this.settings.maxUndo) {
      this.undoStack.shift();
      this.undoPointer--;
    }
    this.undoStack.splice(this.undoPointer, this.undoStack.length - this.undoPointer, {undo, redo});
    this.undoButton.disabled = false;
    this.redoButton.disabled = true;
    redo();
  }
  // similar to state, but exports the canvas instead. this optimally should not be used but may be necessary if making an inverse function is expensive or impossible
  hardState(func) {
    if (!func) throw new Error("Tecknar.hardState() requires a method for the new state.");
    this.undoPointer++;
    if (this.undoPointer >= this.settings.maxUndo) {
      this.undoStack.shift();
      this.undoPointer--;
    }
    const pre = this.export();
    func();
    const post = this.export();
    this.undoStack.splice(this.undoPointer, this.undoStack.length - this.undoPointer, {pre, post});
    this.undoButton.disabled = false;
    this.redoButton.disabled = true;
    this.data = post;
  }
  // undoes the last action
  // make sure that the undo function passed to state() is the inverse of the redo function
  undo() {
    const curstate = this.undoStack[this.undoPointer];
    if (curstate.pre) this.import(curstate.pre);
    else curstate.undo();
    this.undoPointer--;
    this.undoButton.disabled = this.undoPointer == 0;
    this.redoButton.disabled = false;
  }
  // redoes the last action
  redo() {
    this.undoPointer++;
    const state = this.undoStack[this.undoPointer];
    if (state.post) this.import(state.post);
    else state.redo();
    this.undoButton.disabled = false;
    this.redoButton.disabled = this.undoPointer == this.undoStack.length - 1;
  }
  // returns the active layer
  getLayer(index) {
    index ??= this.layerPointer;
    if (this.layerPointer < 0 || this.layerPointer >= this.layers.length) {
      this.layerPointer = 0;
      this.refreshLayerbar();
    }
    const layer = this.layers[index];
    if (layer.type != "group") return {layer, group: [layer]};
    const forward = layer.type == "group"
    const group = [layer];
    let bracket = forward ? 1 : -1;
    for (let i = index + bracket; forward ? i < this.layers.length : i >= 0; i += forward ? 1 : -1) {
      group.push(this.layers[i]);
      if (this.layers[i].type == "group") bracket++;
      else if (this.layers[i].type == "ungroup") bracket--;
      if (bracket == 0) break;
    }
    return {layer, group}
  }
  // sets a value of the active layer
  setLayerValue(property, value) {
    if (!property) throw new Error("Tecknar.setLayer() requires a property to set.");
    const {layer} = this.getLayer();
    const original = layer[property];
    this.state(
      () => {
        layer[property] = original;
        this.refreshLayerbar();
        this.redraw();
      },
      () => {
        layer[property] = value;
        this.refreshLayerbar(); // being extremely lazy...
        this.redraw();
      }
    );
    this.redraw();
  }
  // adds a layer directly above the current one
  addLayer() {
    const index = this.layerPointer;
    this.state(
      () => {
        this.layers.splice(index - 1, 1);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
      },
      () => {
        this.layers.splice(index - 1, 0, {opacity: 1, blending: 0, strokes: [], visible: true});
        this.refreshLayerbar();
        this.layerTreeMutated = true;
      }
    );
  }
  // removes the current layer
  removeLayer() {
    if (this.layers.length == 1) return;
    const {group} = this.getLayer();
    const index = this.layerPointer;
    this.layerPointer = Math.min(this.layerPointer, this.layers.length - 2);
    this.state(
      () => {
        this.layers.splice(index, 0, ...group);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      },
      () => {
        this.layers.splice(index, group.length);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    );
  }
  // moves the current layer up
  layerUp() {
    if (this.layerPointer == 0) return;
    const {group} = this.getLayer();
    const {layer: previous} = this.getLayer(this.layerPointer - 1);
    const index = this.layerPointer;
    this.layerPointer--;
    this.state(
      () => {
        this.layers.splice(index - 1, group.length + 1, previous, ...group)
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      },
      () => {
        this.layers.splice(index - 1, group.length + 1, ...group, previous);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    );
  }
  // moves the current layer down
  layerDown() {
    if (this.layerPointer == this.layers.length - 1) return;
    const {group} = this.getLayer();
    const {layer: next} = this.getLayer(this.layerPointer + group.length);
    const index = this.layerPointer;
    this.layerPointer++;
    this.state(
      () => {
        this.layers.splice(index, group.length + 1, ...group, next);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      },
      () => {
        this.layers.splice(index, group.length + 1, next, ...group);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    );
  }
  // groups the current layer
  groupLayer() {
    const {layer} = this.getLayer();
    const index = this.layerPointer;
    this.layerPointer++;
    this.state(
      () => {
        this.layers.splice(index, 3, layer);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      },
      () => {
        this.layers.splice(index, 1, {type: "group", opacity: 1, blending: 0, visible: true, expanded: true, name: layer.name}, layer, {type: "ungroup"});
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    )
  }
  // ungroups the current layer
  ungroupLayer() {
    let {group} = this.getLayer();
    let index = this.layerPointer;
    if (group.length == 1) {
      let bracket = -1;
      for (let i = this.layerPointer - 1; i >= 0; i--) {
        if (this.layers[i].type == "group") bracket++;
        else if (this.layers[i].type == "ungroup") bracket--;
        if (bracket == 0) {
          index = i;
          let {group: gotgroup} = this.getLayer(i);
          group = gotgroup; // >:(
          break;
        }
      }
      if (bracket != 0) return;
      this.layerPointer--;
    }
    this.state(
      () => {
        this.layers.splice(index, group.length - 2, ...group);
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      },
      () => {
        this.layers.splice(index, group.length, ...group.slice(1, -1));
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    );
  }
  // clears the canvas
  clear() {
    this.hardState(
      () => {
        this.layers = [{opacity: 1, blending: 0, strokes: [], visible: true}];
        this.layerPointer = 0;
        this.refreshLayerbar();
        this.layerTreeMutated = true;
        this.redraw();
      }
    );
  }
  // keypresses
  keyDown(e) {
    if (e.target.tagName == "INPUT" && (e.target.type == "text" || e.target.type == "number")) return;
    if (e.key == "Shift") {this.brush.shiftHeld = true; return};
    if (e.key == "Control" || e.key == "Meta") {this.brush.ctrlHeld = true; return};
    for (let keybindName in this.settings.keybinds) {
      const keybind = this.settings.keybinds[keybindName];
      if (typeof keybind != "string") continue;
      let key = e.key.replace(/[\[\]\{\}\(\)\\\+\*\?\^\$\|]/g, "\\$&");
      if (keybind.match("\\+" + key.toLowerCase() + "$") && (keybind.match("ctrl\\+") ? this.brush.ctrlHeld : !this.brush.ctrlHeld) && (keybind.match("shift\\+") ? this.brush.shiftHeld : !this.brush.shiftHeld)) {
        this.settings.keybinds[keybindName + "Callback"]?.();
        e.preventDefault();
      }
    }
  }
  keyUp(e) {
    if (e.target.tagName == "INPUT" && (e.target.type == "text" || e.target.type == "number")) return;
    if (e.key == "Shift") this.brush.shiftHeld = false;
    if (e.key == "Control" || e.key == "Meta") this.brush.ctrlHeld = false;
  }
  
  // canvas methods
  // reorganizes the layer data into a tree
  reorganize() {
    if (!this.layerTreeMutated && this.layerTreeCache) return this.layerTreeCache;
    const tree = {type: "root", children: []};
    let current = [tree];
    for (let layer of this.layers) {
      if (layer.type == "ungroup") current.pop();
      else if (layer.type == "group") {
        const group = {type: "group", children: [], object: layer};
        current[current.length - 1].children.splice(0, 0, group);
        current.push(group);
      } else current[current.length - 1].children.splice(0, 0, {type: "layer", object: layer});
    }
    this.layerTreeCache = tree;
    this.layerTreeMutated = false;
    return tree;
  }
  // draws a stroke into opacityCtx
  drawStroke(stroke, live) {
    if (!stroke) throw new Error("Tecknar.drawStroke() requires a context and a stroke to draw.");
    const ctx = live ? this.liveOpacityCtx : this.opacityCtx;
    ctx.clearRect(0, 0, this.opacityCanvas.width, this.opacityCanvas.height);
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.fillColor;
    ctx.lineWidth = stroke.size;
    if (!live || stroke.type != "pen" || stroke.points.length == 1) ctx.beginPath();
    switch (stroke.type) {
      case "pen": {
        if (!live) {
          ctx.moveTo(stroke.points[0][0], stroke.points[0][1])
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
          }
        } else ctx[stroke.points.length == 1 ? "moveTo" : "lineTo"](stroke.points[stroke.points.length - 1][0], stroke.points[stroke.points.length - 1][1]);
        break;
      }
      case "line": {
        ctx.moveTo(stroke.x1, stroke.y1);
        ctx.lineTo(stroke.x2, stroke.y2);
        break;
      }
      case "rect": {
        ctx.rect(stroke.x1, stroke.y1, stroke.x2 - stroke.x1, stroke.y2 - stroke.y1);
        break;
      }
      case "circle": {
        ctx.ellipse((stroke.x1 + stroke.x2) / 2, (stroke.y1 + stroke.y2) / 2, Math.abs(stroke.x2 - stroke.x1) / 2, Math.abs(stroke.y2 - stroke.y1) / 2, 0, 0, Math.PI * 2);
        break;
      }
    }
    if (stroke.fill) ctx.fill();
    ctx.stroke();
  }
  // draws a layer onto a context, or reuses a cache if possible
  redrawLayer(layer, live) {
    if (!layer) throw new Error("Tecknar.redrawLayer() requires a context and a layer to redraw.");
    if (layer.type == "group") throw new Error("Tecknar.redrawLayer() cannot redraw a group layer. Use Tecknar.drawGroup() instead.");
    if (this.layers[this.layerPointer] != layer && live) live = false;
    if (layer.cache && live) {
      const stroke = layer.strokes[layer.strokes.length - 1];
      this.drawStroke(stroke, true);
      layer.workingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      layer.workingCtx.globalAlpha = 1;
      layer.workingCtx.globalCompositeOperation = "source-over";
      layer.workingCtx.drawImage(layer.cache, 0, 0);
      layer.workingCtx.globalAlpha = stroke.opacity;
      layer.workingCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      layer.workingCtx.drawImage(this.liveOpacityCanvas, 0, 0);
    };
    if (layer.cache) return;
    layer.cache = document.createElement("canvas");
    layer.cache.width = this.canvas.width;
    layer.cache.height = this.canvas.height;
    layer.cacheCtx = layer.cache.getContext("2d");
    layer.workingCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
    layer.workingCtx = layer.workingCanvas.getContext("2d");
    for (let sid in layer.strokes) {
      const stroke = layer.strokes[sid];
      if (live && sid == layer.strokes.length - 1) continue;
      this.drawStroke(stroke);
      layer.cacheCtx.globalAlpha = stroke.opacity;
      layer.cacheCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      layer.cacheCtx.drawImage(this.opacityCanvas, 0, 0);
    }
    layer.workingCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    layer.workingCtx.drawImage(layer.cache, 0, 0);
    if (live) {
      const stroke = layer.strokes[layer.strokes.length - 1];
      this.drawStroke(stroke, true);
      layer.workingCtx.globalAlpha = stroke.opacity;
      layer.workingCtx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
      layer.workingCtx.drawImage(this.liveOpacityCanvas, 0, 0);
    }
  }
  // group traversal method
  drawGroup(group, opacity, live, parent) {
    if (!group) throw new Error("Tecknar.drawGroup() requires a group to draw.");
    group.canvas = parent ? parent.canvas : new OffscreenCanvas(this.canvas.width, this.canvas.height);
    group.ctx = group.canvas.getContext("2d");
    for (let child of group.children) {
      if (!child.object.visible) continue;
      if (child.type == "group") {
        this.drawGroup(
          child,
          child.object.blending == 255 ? child.object.opacity * opacity : 1,
          live,
          child.object.blending == 255 ? (parent ?? group) : null
        );
        if (child.object.blending == 255) continue;
      } else this.redrawLayer(child.object, live);
      group.ctx.globalAlpha = child.object.opacity * opacity;
      group.ctx.globalCompositeOperation = this.blendModeNames[child.object.blending];
      group.ctx.drawImage(child.object.workingCanvas ?? child.canvas, 0, 0);
    }
  }
  // redraws entire canvas. live allows current stroke to be redrawn dynamically
  redraw(live) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const tree = this.reorganize();
    this.drawGroup(tree, 1, live, {canvas: this.canvas, ctx: this.ctx});
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
  }
  // absolute position based on viewport
  absolute(x, y) {
    if (!isFinite(x) || !isFinite(y)) throw new Error("Tecknar.absolute() requires an x and y coordinate to convert.");
    return [(x * (this.viewportZoom) / (this.canvasScale.value / 100))|0, (y * (this.viewportZoom) / (this.canvasScale.value / 100))|0];
  }
  // adds a new stroke to the active layer
  startStroke(x, y) {
    if (!isFinite(x) || !isFinite(y)) throw new Error("Tecknar.startStroke() requires an x and y coordinate to start a stroke.");
    const {layer} = this.getLayer();
    if (layer.type == "group") return;
    this.brush.isDrawing = true;
    const [ax, ay] = this.absolute(x, y);
    switch (this.brush.type) {
      case "pen": {
        layer.strokes.push({
          type: "pen",
          erase: this.brush.erase,
          fill: this.brush.fill,
          color: this.brush.color,
          fillColor: this.brush.fillColor,
          size: this.brush.size,
          opacity: this.brush.opacity,
          points: [[ax, ay]]
        });
        break;
      }
      default: {
        layer.strokes.push({
          type: this.brush.type,
          erase: this.brush.erase,
          fill: this.brush.fill,
          color: this.brush.color,
          fillColor: this.brush.fillColor,
          size: this.brush.size,
          opacity: this.brush.opacity,
          x1: ax,
          y1: ay,
          x2: ax,
          y2: ay
        });
        break;
      }
    }
    this.redraw(true);
  }
  // modifies the top-most stroke of the active layer. should be called after Tecknar.startStroke()
  continueStroke(x, y) {
    if (!this.brush.isDrawing) return;
    if (!isFinite(x) || !isFinite(y)) throw new Error("Tecknar.continueStroke() requires an x and y coordinate to continue a stroke.");
    const {layer} = this.getLayer();
    if (layer.type == "group") return;
    const stroke = layer.strokes[layer.strokes.length - 1];
    const [ax, ay] = this.absolute(x, y);
    switch (this.brush.type) {
      case "pen": {
        stroke.points.push([ax, ay]);
        break;
      }
      case "line": {
        if (this.brush.shiftHeld) {
          let angle = Math.atan2(ay - stroke.y1, ax - stroke.x1);
          const dist = Math.sqrt((ax - stroke.x1) ** 2 + (ay - stroke.y1) ** 2);
          const nearest30 = Math.round(angle / (Math.PI / 6)) * (Math.PI / 6);
          const nearest45 = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
          const nangle = Math.min(Math.abs(nearest30 - angle), Math.abs(nearest45 - angle));
          angle = nangle == Math.abs(nearest30 - angle) ? nearest30 : nearest45;
          stroke.x2 = stroke.x1 + dist * Math.cos(angle);
          stroke.y2 = stroke.y1 + dist * Math.sin(angle);
        } else {
          stroke.x2 = ax;
          stroke.y2 = ay;
        }
        break;
      }
      default: {
        if (this.brush.shiftHeld) {
          let signx = Math.sign(ax - stroke.x1);
          let signy = Math.sign(ay - stroke.y1);
          stroke.x2 = stroke.x1 + signx * Math.max(Math.abs(ax - stroke.x1), Math.abs(ay - stroke.y1));
          stroke.y2 = stroke.y1 + signy * Math.max(Math.abs(ax - stroke.x1), Math.abs(ay - stroke.y1));
        } else {
          stroke.x2 = ax;
          stroke.y2 = ay;
        }
      }
    }
    this.redraw(true);
  }
  // turns off Tecknar.isDrawing and does some post-processing if needed. should be called after Tecknar.startStroke()
  endStroke() {
    if (!this.brush.isDrawing) return;
    this.brush.isDrawing = false;
    const {layer} = this.getLayer();
    if (layer.type == "group") return;
    const stroke = layer.strokes.pop();
    if (this.brush.type == "pen") stroke.points = this.#DouglasPeucker(stroke.points);
    this.state(
      () => {
        layer.strokes.pop();
        layer.cache = null;
        this.redraw();
      },
      () => {
        layer.strokes.push(stroke);
        layer.cache = null;
        this.redraw();
      }
    )
    this.refreshLayerbar();
  }

  // data handling
  // little endian encoding of number via byte extension
  // 7 bits per byte, with the 8th bit indicating if there are more bytes
  #encodeNumber(n) {
    if (!isFinite(n)) throw new Error("Tecknar.encodeNumber() requires a number to encode.");
    if (n < 0) throw new Error("Tecknar.encodeNumber() requires a positive number to encode. You may want to use Tecknar.encodeSignedNumber() instead.");
    if (n < 128) return [n];
    const bytes = [];
    while (n > 0) {
      bytes.push(n & 0x7f | 0x80);
      n >>= 7;
    }
    bytes[bytes.length - 1] &= 0x7f;
    return bytes;
  }
  // these decode methods will return an array instead because. fucking. javascript tuples don't exist
  #decodeNumber(bytes, i) {
    if (!bytes || !isFinite(i)) throw new Error("Tecknar.decodeNumber() requires a byte array and an index to decode.");
    if (~bytes[i] & 0x80) return [bytes[i], ++i];
    let n = 0;
    let length = 0;
    while (bytes[i-1] & 0x80 || !length) n |= (bytes[i++] & ~0x80) << (7 * length++);
    return [n, i];
  }
  // only real difference is that it may require an additional byte to encode the number unambiguously
  // I'm pretty sure zigzag encoding will result in the same amount of bytes
  #encodeSignedNumber(n) {
    if (!isFinite(n)) throw new Error("Tecknar.encodeSignedNumber() requires a number to encode.");
    if (n == 0) return [0];
    let bits = Math.floor(Math.log2(Math.abs(n))) + 1;
    if (bits % 7 == 0) bits++;
    const bytes = [];
    while (bits > 0) {
      bytes.push((n & 0x7f) | 0x80);
      n >>= 7;
      bits -= 7;
    }
    bytes[bytes.length - 1] &= 0x7f;
    return bytes;
  }
  #decodeSignedNumber(bytes, i) {
    if (!bytes || !isFinite(i)) throw new Error("Tecknar.decodeSignedNumber() requires a byte array and an index to decode.");
    if (~bytes[i] & 0x80) return [bytes[i] << 25 >> 25, ++i];
    let n = 0;
    let length = 0;
    while (bytes[i-1] & 0x80 || !length) n |= (bytes[i++] & ~0x80) << (7 * length++);
    return [n << (32 - 7 * length) >> (32 - 7 * length), i];
  }
  // strings
  #encodeString(str) {
    if (typeof str != "string") throw new Error("Tecknar.encodeString() requires a string to encode.");
    if (str == "") return [0];
    const bytes = [...this.#encodeNumber(str.length)];
    for (let i = 0; i < str.length; i++) {
      bytes.push(str.charCodeAt(i));
    }
    return bytes;
  }
  #decodeString(bytes, i) {
    if (!bytes || !isFinite(i)) throw new Error("Tecknar.decodeString() requires a byte array and an index to decode.");
    let length = 0;
    [length, i] = this.#decodeNumber(bytes, i);
    let str = "";
    for (let j = 0; j < length; j++) {
      str += String.fromCharCode(bytes[i++]);
    }
    return [str, i];
  }
  #splithex(s) {
    if (typeof s != "string" || !s.match(/^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)) throw new Error("Tecknar.splithex() requires a hex string to split.");
    if (s.match("#")) s = s.slice(1);
    const unit = s.length < 6 ? 1 : 2;
    const r = parseInt(s.slice(0, unit), 16);
    const g = parseInt(s.slice(unit, unit * 2), 16);
    const b = parseInt(s.slice(unit * 2, unit * 3), 16);
    let a = parseInt(s.slice(unit * 3, unit * 4), 16);
    if (isNaN(a)) a = 255;
    return [r, g, b, a];
  }
  #joinhex(r, g, b, a) {
    if (!isFinite(r) || !isFinite(g) || !isFinite(b)) throw new Error("Tecknar.joinhex() requires at least three numbers to join.");
    if (a === undefined) a = 255;
    return "#" + r.toString(16).padStart(2, "0") + g.toString(16).padStart(2, "0") + b.toString(16).padStart(2, "0") + a.toString(16).padStart(2, "0"); // okay
  }
  /*
    Version 4
    *: multiple
    ?: optional
    <...>: group
    [...]: data
      binary data is little endian
    string: [length][data]
      length: number (extendable)
      data: characters
    format: [version]<string (attributes)?>:<group|endgroup|layer|stroke*>
      version: string
      attributes: string
        a: use absolute coordinates
        (attribute l is no longer used)
        o: use stroke opacity (I forgot to implement it in the peior version...)
    group: 0xfe[opacity][blending][metadata]<string (name)>
      opacity: number (0-255)
      blending: number (0-255)
        255 is reserved for passthrough
      metadata: [visible][expanded]000000
        visible: boolean
        expanded: boolean]
    endgroup: 0xfd
    layer: 0xff[opacity][blending][visibility]<string (name)>
      opacity: number (0-255)
      blending: number (0-255)
      visibility: number (0-1)
    stroke: [type][mode][opacity]<color (outline)><color (fill)>[size]<data>
      type: number (0-253)
        0x00: pen
          data: [length]<point*>
            length: number (extendable)
        0x01: line
          data: <point><point>
        0x02: rectangle
          data: <point><point>
        0x03: circle
          data: <point><point>
      mode: [erase][fill]000000
        erase: boolean
        fill: boolean
      opacity: number (0-255)
      color: [r][g][b][a]
        r: number (0-255)
        g: number (0-255)
        b: number (0-255)
        a: number (0-255)
      size: number (extendable)
    point: [x][y]
      x: number (extendable)
      y: number (extendable)
    number (extendable)
  */
  // generates the data for the canvas
  // this might? be expensive? just don't use it frequently
  export() {
    let canvasdata = [...this.#encodeNumber(this.settings.width), ...this.#encodeNumber(this.settings.height)];
    for (let layer of this.layers) {
      if (layer.type == "ungroup") {
        canvasdata.push(0xfd);
        continue;
      } else if (layer.type == "group") {
        canvasdata.push(
          0xfe,
          (layer.opacity * 100)|0,
          +layer.blending,
          (layer.visible ? 0x01 : 0x00) | (layer.expanded ? 0x02 : 0x00),
          ...this.#encodeString(layer.name ?? "")
        );
        continue;
      }
      canvasdata.push(
        0xff,
        (layer.opacity * 100)|0,
        +layer.blending,
        layer.visible ? 0x01 : 0x00,
        ...this.#encodeString(layer.name ?? "")
      );
      for (let stroke of layer.strokes) {
        const mode = (stroke.erase ? 0x01 : 0x00) | (stroke.fill ? 0x02 : 0x00);
        const opacity = (stroke.opacity * 100)|0;
        const color = this.#splithex(stroke.color);
        const fillColor = this.#splithex(stroke.fillColor);
        const size = this.#encodeNumber(stroke.size);
        switch (stroke.type) {
          case "pen": {
            const len = this.#encodeNumber(stroke.points.length);
            canvasdata.push(0x00, mode, opacity, ...color, ...fillColor, ...size, ...len);
            for (let i = 0; i < stroke.points.length; i++) {
              const cur = stroke.points[i];
              cur[0] = Math.max(cur[0], 0);
              cur[1] = Math.max(cur[1], 0);
              if (i == 0) {
                canvasdata.push(...this.#encodeNumber(cur[0]), ...this.#encodeNumber(cur[1]));
              } else {
                const prev = stroke.points[i - 1];
                const dx = cur[0] - prev[0];
                const dy = cur[1] - prev[1];
                canvasdata.push(...this.#encodeSignedNumber(dx), ...this.#encodeSignedNumber(dy));
              }
            }
            break;
          }
          default: {
            stroke.x1 = Math.max(stroke.x1, 0);
            stroke.y1 = Math.max(stroke.y1, 0);
            stroke.x2 = Math.max(stroke.x2, 0);
            stroke.y2 = Math.max(stroke.y2, 0);
            canvasdata.push(
              {line: 0x01, rect: 0x02, circle: 0x03}[stroke.type],
              mode, opacity, ...color, ...fillColor, ...size,
              ...this.#encodeNumber(stroke.x1), ...this.#encodeNumber(stroke.y1),
              ...this.#encodeNumber(stroke.x2), ...this.#encodeNumber(stroke.y2)
            );
            break;
          }
        }
      }
    }
    const bytes = new Uint8Array(canvasdata);
    const compressed = pako.deflate(bytes, {level: this.settings.compressionLevel});
    let binary = "";
    for (let i = 0; i < compressed.length; i++) {
      binary += String.fromCharCode(compressed[i]);
    }
    let data = "4o:" + btoa(binary); // wow!!!! four!!!!
    data = data.replace(/\+/g, "-").replace(/\//g, "/").replace(/=/g, "");
    this.data = data;
    return {data, bytes, compressed};
  }
  // imports the data for the canvas
  // this also upgrades previous codes to the new format
  // apologies if you hate deep nesting hahahahaha
  import(string) {
    if (!string) throw new Error("Tecknar.import() requires a base64 string to import.");
    let [_, version, params, base64] = (string.match(/^(\d+)([a-z]*):(.+)/) ?? [null, "1", "", string])
    base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    let binary = atob(base64);
    let bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const absolute = version < 3 || params.match("a");
    const useLayerNames = version != 3 || params.match("l");
    const useBrushOpacity = version > 4 || params.match("o");
    if (version > 1) bytes = pako.inflate(bytes);

    let i = 0;
    function l(s, d) {
      //console.log(i, s, d, typeof d == "number" ? "0x"+d.toString(16).padStart(2, "0") : "", bytes.slice(i, i+15).toString());
    }
    if (version < 4) [this.settings.width, this.settings.height] = [250, 200];
    else {
      [this.settings.width, i] = this.#decodeNumber(bytes, i);
      l("width", this.settings.width);
      [this.settings.height, i] = this.#decodeNumber(bytes, i);
      l("height", this.settings.height);
    }
    if (version < 3 || bytes[i] < 0xfd) this.layers = [{opacity: 1, blending: 0, strokes: [], visible: true}];
    else this.layers = [];
    let currentLayer = this.layers[this.layers.length - 1];

    let bracket = 0;
    while (i < bytes.length) {
      const type = version < 3 ? 0x00 : bytes[i];
      i += version < 3 ? 0 : 1;
      l("type", type);
      switch (type) {
        case 0xfd: {
          if (!bracket) throw new Error("endgroup 0xfd called without a matching group 0xfe");
          bracket--;
          this.layers.push({type: "ungroup"});
          currentLayer = null;
          break;
        }
        case 0xfe: {
          bracket++;
          const opacity = bytes[i] / 100; i++;
          l("opacity", opacity);
          const blending = bytes[i]; i++;
          l("blending", blending);
          const metadata = bytes[i]; i++;
          l("metadata", metadata);
          const visible = metadata & 0x01;
          const expanded = metadata & 0x02;
          let name = "";
          [name, i] = this.#decodeString(bytes, i);
          l("name", name);
          this.layers.push({type: "group", opacity, blending, visible, expanded, name});
          currentLayer = null;
          break;
        }
        case 0xff: {
          const opacity = bytes[i] / 100; i++;
          l("opacity", opacity);
          const blending = bytes[i]; i++;
          l("blending", blending);
          const visible = bytes[i]; i++;
          l("visible", visible);
          let name = "";
          if (useLayerNames) [name, i] = this.#decodeString(bytes, i);
          l("name", name);
          this.layers.push({opacity, blending, visible, strokes: [], name});
          currentLayer = this.layers[this.layers.length - 1];
          break;
        }
        default: {
          if (type > 0x03) throw new Error("invalid stroke type 0x" + type.toString(16).padStart(2, "0"));
          if (!currentLayer) throw new Error("stroke 0x00 called without a matching layer 0xff");
          const mode = version < 3 ? 0 : bytes[i];
          i += version < 3 ? 0 : 1;
          l("mode", mode);
          const opacity = useBrushOpacity ? bytes[i] / 100 : 1;
          i += useBrushOpacity ? 1 : 0;
          l("opacity", opacity);
          const erase = mode & 0x01;
          const fill = mode & 0x02;
          const r = bytes[i]; i++;
          l("r", r)
          const g = bytes[i]; i++;
          l("g", g)
          const b = bytes[i]; i++;
          l("b", b)
          const a = version < 3 ? 255 : bytes[i];
          i += version < 3 ? 0 : 1;
          l("a", a)
          let fillR = r, fillG = g, fillB = b, fillA = a;
          if (version >= 4) {
            fillR = bytes[i]; i++;
            l("fillR", fillR)
            fillG = bytes[i]; i++;
            l("fillG", fillG)
            fillB = bytes[i]; i++;
            l("fillB", fillB)
            fillA = bytes[i]; i++;
            l("fillA", fillA)
          }
          const size = bytes[i]; i++;
          l("size", size);
          let stroke = {
            type: ["pen", "line", "rect", "circle"][type],
            erase: !!erase,
            fill: !!fill,
            opacity: opacity,
            color: this.#joinhex(r, g, b, a),
            fillColor: this.#joinhex(fillR, fillG, fillB, fillA),
            size: size,
          }
          if (type == 0x00) {
            let len = 0;
            if (version < 4) {
              const lensize = bytes[i]; i++;
              l("lensize", lensize);
              for (let j=0; j < lensize; j++) {
                len |= bytes[i] << (8 * j);
                i++;
              }
            } else [len, i] = this.#decodeNumber(bytes, i);
            l("len", len);
            stroke.points = [];
            for (let j=0; j < len; j++) {
              let pos = [];
              if (version < 4) {
                pos.push(bytes[i]); i++;
                l("point x", pos[0]);
                pos.push(bytes[i]); i++;
                l("point y", pos[1]);
                if (!absolute && stroke.points.length > 0) {
                  const last = stroke.points[stroke.points.length - 1];
                  pos = [last[0] + (pos[0] << 24 >> 24), last[1] + (pos[1] << 24 >> 24)];
                }
              } else {
                const decoder = (absolute || j == 0) ? this.#decodeNumber : this.#decodeSignedNumber;
                [pos[0], i] = decoder(bytes, i);
                l("point x", pos[0]);
                [pos[1], i] = decoder(bytes, i);
                l("point y", pos[1]);
                if (!absolute && stroke.points.length > 0) {
                  const last = stroke.points[stroke.points.length - 1];
                  pos = [last[0] + pos[0], last[1] + pos[1]];
                }
              }
              stroke.points.push(pos);
            }
          } else {
            if (version < 4) {
              stroke.x1 = bytes[i]; i++;
              l("x1", stroke.x1);
              stroke.y1 = bytes[i]; i++;
              l("y1", stroke.y1);
              stroke.x2 = bytes[i]; i++;
              l("x2", stroke.x2);
              stroke.y2 = bytes[i]; i++;
              l("y2", stroke.y2)
            } else {
              [stroke.x1, i] = this.#decodeNumber(bytes, i);
              l("x1", stroke.x1);
              [stroke.y1, i] = this.#decodeNumber(bytes, i);
              l("y1", stroke.y1);
              [stroke.x2, i] = this.#decodeNumber(bytes, i);
              l("x2", stroke.x2);
              [stroke.y2, i] = this.#decodeNumber(bytes, i);
              l("y2", stroke.y2);
            }
          }
          currentLayer.strokes.push(stroke);
          break;
        }
      }
    }
    this.layerPointer = 0;
    this.refreshCanvas();
    this.refreshLayerbar();
  }
}
