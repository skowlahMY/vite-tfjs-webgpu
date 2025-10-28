import Live2DCanvas from "../components/Live2DCanvas";

export default function TryAvatarPage() {
  return (
    <div>
      <h1>Basic Page</h1>
      <p>This is the basic page content.</p>
      <div>
      <Live2DCanvas />
      </div>
    </div>
  );
}

/*

check react example here https://codesandbox.io/p/sandbox/test2d-4xsh9d?file=%2Fsrc%2FApp.js

import { useEffect } from "react";
import * as PIXI from "pixi.js";
import { Live2DModel } from "pixi-live2d-display/cubism4";

window.PIXI = PIXI;

Live2DModel.registerTicker(PIXI.Ticker);
// register InteractionManager to make Live2D models interactive
PIXI.Renderer.registerPlugin("interaction", PIXI.InteractionManager);

function App() {
  useEffect(() => {
    const app = new PIXI.Application({
      view: document.getElementById("canvas"),
      autoStart: true,
      resizeTo: window
    });

    Live2DModel.from("resources/runtimeb/mao_pro_t02.model3.json", {
      idleMotionGroup: "Idle"
    }).then((model) => {
      app.stage.addChild(model);
      model.anchor.set(0.5, 0.5);
      model.position.set(window.innerWidth / 4, window.innerHeight / 4);
      model.scale.set(0.09, 0.09);

      model.on("pointertap", () => {
        model.motion("Tap@Body");
      });
    });
  }, []);

  return <canvas id="canvas" />;
}
export default App;


HTML part
=========

<div id="root"></div>
    <script src="/live2dcubismcore.min.js"></script>


package.json
============    

    "dependencies": {
    "pixi-live2d-display": "0.4.0",
    "pixi.js": "6.3.0",
    "react": "17.0.2",
    "react-dom": "17.0.2",
    "react-scripts": "4.0.0"
  },




*/