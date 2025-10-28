import React, { useEffect, useRef } from 'react';

// IMPORTANT: Do NOT import PIXI or pixi-live2d-display here.
// Rely on the global variables (PIXI, PIXI.live2d) set by the <script> tags in index.html.

const CUBISM4_MODEL = "/model/kei/kei_vowels_pro.model3.json"; // Path relative to public folder

// -----------------------------------------------------------
// Helper functions (use global PIXI)
// -----------------------------------------------------------

function draggable(model) {
    model.buttonMode = true;
    model.on("pointerdown", (e) => {
        model.dragging = true;
        model._pointerX = e.data.global.x - model.x;
        model._pointerY = e.data.global.y - model.y;
    });
    model.on("pointermove", (e) => {
        if (model.dragging) {
            model.position.x = e.data.global.x - model._pointerX;
            model.position.y = e.data.global.y - model._pointerY;
        }
    });
    model.on("pointerupoutside", () => (model.dragging = false));
    model.on("pointerup", () => (model.dragging = false));
}

// -----------------------------------------------------------
// Main Live2D Component
// -----------------------------------------------------------

const Live2DCanvas = () => {
    const canvasRef = useRef(null);
    const appRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !window.PIXI || !window.PIXI.live2d) {
            console.error("PIXI or Live2D libraries are not available globally.");
            return;
        }
        
        const PIXI = window.PIXI;
        const Live2DModel = PIXI.live2d.Live2DModel;

        // 1. Initialize PIXI Application
        const app = new PIXI.Application({
            view: canvasRef.current,
            autoStart: true,
            // Resize to the parent div's current size (not the window)
            resizeTo: canvasRef.current.parentElement, 
            backgroundColor: 0x333333,
            // Set autoDensity to true for better resolution handling
            autoDensity: true
        });
        appRef.current = app;

        // 2. Load and Configure Model
        async function loadModel() {
            try {
                const model = await Live2DModel.from(CUBISM4_MODEL);

                app.stage.addChild(model);

                // --- Scaling and Positioning ---
                const parentElement = canvasRef.current.parentElement;
                const parentWidth = parentElement.clientWidth;
                const parentHeight = parentElement.clientHeight;
                
                // Original scaling logic adapted for the container size
                const scaleX = (parentWidth * 0.9) / model.width;
                const scaleY = (parentHeight * 0.9) / model.height;

                // Fit the container
                model.scale.set(Math.min(scaleX, scaleY));
                
                // Center the model in the container
                // model.x = (parentWidth - model.width * model.scale.x) / 2;
                // model.y = (parentHeight - model.height * model.scale.y) / 2;

                model.x = 20;
                model.y = 30;

                // --- Interactive Features ---
                // draggable(model);
                
                // Event handling based on the original HTML
                model.on("hit", (hitAreas) => {
                    if (hitAreas.includes("Body")) {
                        model.motion('Tap');
                    }
                    if (hitAreas.includes("Head")) {
                        model.expression();
                    }
                });
                
                console.log("✅ Live2D Model rendered successfully!");

            } catch (error) {
                console.error("❌ Failed to load Live2D model or assets:", error);
                // Check network tab for 404s on model files (json, moc, textures)
            }
        }

        loadModel();
        
        // 3. Cleanup Function
        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, true);
                appRef.current = null;
            }
        };
    }, []); 
    
    // Ensure the canvas div fills the parent container for PIXI to resize correctly
    return (
        // <div style={{ width: '220px', height: '220px', overflow: 'hidden' }}>
            <>
            <canvas ref={canvasRef} style={{ display: 'block', width: '300px', height: '300px' }} />
        </>
    );
};

export default Live2DCanvas;