/* =========================================================
   MARS PORTAL AR
========================================================= */


import * as THREE
from "three";


import {
    GLTFLoader
}
from "three/addons/loaders/GLTFLoader.js";



/* =========================================================
   FILES

   CAPITALIZATION MUST MATCH GITHUB EXACTLY
========================================================= */


const PORTAL_MODEL_PATH =
    "./models/Portalbox.glb";


const MARS_MODEL_PATH =
    "./models/MarsBackground.glb";


/*
    The plane inside Portalbox.glb MUST
    have this Blender object name.
*/

const MASK_OBJECT_NAME =
    "PortalMask";



/* =========================================================
   PORTAL SIZE

   Approximately normal doorway height.
========================================================= */


const TARGET_PORTAL_HEIGHT =
    2.2;



/* =========================================================
   MARS POSITION

   ASSUMPTION:

   Portal faces +Z toward the user.
   Mars extends behind it toward -Z.

   If Mars appears on the wrong side,
   change -1.0 to +1.0.
========================================================= */


const MARS_WORLD_OFFSET_X =
    0;


const MARS_WORLD_OFFSET_Y =
    0;


const MARS_WORLD_OFFSET_Z =
    -1.0;



/* =========================================================
   MARS SCALE / ROTATION

   These are easy adjustment controls.
========================================================= */


const MARS_WORLD_SCALE =
    1;


const MARS_WORLD_ROTATION_Y =
    0;



/* =========================================================
   DEBUG MASK

   FALSE:
   mask is invisible like it should be.

   TRUE:
   mask becomes bright pink so you can
   see exactly where it is.
========================================================= */


const SHOW_MASK_FOR_DEBUG =
    false;



/* =========================================================
   USER SCALE
========================================================= */


const MIN_USER_SCALE =
    0.4;


const MAX_USER_SCALE =
    3;



/* =========================================================
   HTML
========================================================= */


const startARButton =
    document.getElementById(
        "startARButton"
    );


const supportMessage =
    document.getElementById(
        "supportMessage"
    );


const arStatus =
    document.getElementById(
        "arStatus"
    );


const placementMessage =
    document.getElementById(
        "placementMessage"
    );


const arControls =
    document.getElementById(
        "arControls"
    );


const rotateButton =
    document.getElementById(
        "rotateButton"
    );


const smallerButton =
    document.getElementById(
        "smallerButton"
    );


const largerButton =
    document.getElementById(
        "largerButton"
    );


const replaceButton =
    document.getElementById(
        "replaceButton"
    );


const exitARButton =
    document.getElementById(
        "exitARButton"
    );


const androidCard =
    document.getElementById(
        "androidCard"
    );


const iphoneCard =
    document.getElementById(
        "iphoneCard"
    );


const canvas =
    document.getElementById(
        "arCanvas"
    );



/* =========================================================
   DEVICE
========================================================= */


const isIOS =

    /iPad|iPhone|iPod/.test(
        navigator.userAgent
    )

    ||

    (
        navigator.platform ===
        "MacIntel"

        &&

        navigator.maxTouchPoints >
        1
    );


const isAndroid =

    /Android/i.test(
        navigator.userAgent
    );



/* =========================================================
   THREE.JS VARIABLES
========================================================= */


let scene;

let camera;

let renderer;


let xrSession =
    null;


let viewerReferenceSpace =
    null;


let localReferenceSpace =
    null;


let hitTestSource =
    null;


let controller;

let reticle;



/* =========================================================
   PORTAL
========================================================= */


let portalRoot =
    null;


let contentGroup =
    null;


let portalScene =
    null;


let marsScene =
    null;


let portalMask =
    null;


let portalLoaded =
    false;


let marsLoaded =
    false;


let experienceReady =
    false;


let portalPlaced =
    false;


let modelRotation =
    0;


let userScale =
    1;



/* =========================================================
   ANIMATION MIXERS
========================================================= */


let portalMixer =
    null;


let marsMixer =
    null;


const animationClock =
    new THREE.Clock();



/* =========================================================
   INITIALIZE
========================================================= */


function initializePage() {


    startARButton.disabled =
        true;



    if (
        isIOS
    ) {


        iphoneCard.classList.add(
            "recommended"
        );



        supportMessage.textContent =

            "iPhone/iPad detected. The full stencil portal currently requires WebXR on Android.";



        supportMessage.className =
            "support-message warning";



        return;


    }



    if (
        isAndroid
    ) {


        androidCard.classList.add(
            "recommended"
        );


    }



    createThreeJS();


}



/* =========================================================
   THREE.JS
========================================================= */


function createThreeJS() {


    scene =
        new THREE.Scene();



    camera =
        new THREE.PerspectiveCamera(

            70,

            window.innerWidth /
            window.innerHeight,

            0.01,

            100

        );



    /*
        STENCIL MUST BE TRUE.
    */

    renderer =
        new THREE.WebGLRenderer({

            canvas:
                canvas,

            alpha:
                true,

            antialias:
                true,

            stencil:
                true

        });



    renderer.setPixelRatio(

        Math.min(

            window.devicePixelRatio,

            2

        )

    );



    renderer.setSize(

        window.innerWidth,

        window.innerHeight

    );



    renderer.setClearColor(

        0x000000,

        0

    );



    renderer.autoClear =
        true;



    renderer.xr.enabled =
        true;



    renderer.xr.setReferenceSpaceType(
        "local"
    );



    renderer.outputColorSpace =
        THREE.SRGBColorSpace;



    /* =====================================================
       LIGHTS
    ===================================================== */


    const hemisphere =
        new THREE.HemisphereLight(

            0xffffff,

            0x332211,

            2.2

        );


    scene.add(
        hemisphere
    );



    const keyLight =
        new THREE.DirectionalLight(

            0xffd0a0,

            2.5

        );


    keyLight.position.set(

        4,

        6,

        3

    );


    scene.add(
        keyLight
    );



    const fillLight =
        new THREE.DirectionalLight(

            0x7799ff,

            1.1

        );


    fillLight.position.set(

        -3,

        3,

        -4

    );


    scene.add(
        fillLight
    );



    createReticle();



    controller =
        renderer.xr.getController(
            0
        );



    controller.addEventListener(

        "select",

        onSelect

    );



    scene.add(
        controller
    );



    loadPortalExperience();



    window.addEventListener(

        "resize",

        onWindowResize

    );


}



/* =========================================================
   RETICLE
========================================================= */


function createReticle() {


    const geometry =
        new THREE.RingGeometry(

            0.15,

            0.19,

            64

        );



    geometry.rotateX(

        -Math.PI /
        2

    );



    const material =
        new THREE.MeshBasicMaterial({

            color:
                0xff6a2a,

            transparent:
                true,

            opacity:
                0.95,

            side:
                THREE.DoubleSide

        });



    reticle =
        new THREE.Mesh(

            geometry,

            material

        );



    reticle.matrixAutoUpdate =
        false;



    reticle.visible =
        false;



    scene.add(
        reticle
    );


}



/* =========================================================
   GLTF LOADER PROMISE
========================================================= */


function loadGLB(
    path
) {


    const loader =
        new GLTFLoader();



    return new Promise(

        function (
            resolve,
            reject
        ) {


            loader.load(

                path,

                resolve,

                undefined,

                reject

            );


        }

    );


}



/* =========================================================
   LOAD BOTH MODELS
========================================================= */


async function loadPortalExperience() {


    try {


        supportMessage.textContent =

            "Loading portal frame...";



        const portalGLTF =

            await loadGLB(
                PORTAL_MODEL_PATH
            );



        portalScene =
            portalGLTF.scene;



        portalLoaded =
            true;



        supportMessage.textContent =

            "Portal loaded. Loading Mars...";



        const marsGLTF =

            await loadGLB(
                MARS_MODEL_PATH
            );



        marsScene =
            marsGLTF.scene;



        marsLoaded =
            true;



        /* =================================================
           ROOT STRUCTURE
        ================================================= */


        portalRoot =
            new THREE.Group();



        portalRoot.name =
            "MarsPortalRoot";



        contentGroup =
            new THREE.Group();



        contentGroup.name =
            "MarsPortalContent";



        portalRoot.add(
            contentGroup
        );



        /* =================================================
           POSITION MARS BEHIND PORTAL
        ================================================= */


        marsScene.position.set(

            MARS_WORLD_OFFSET_X,

            MARS_WORLD_OFFSET_Y,

            MARS_WORLD_OFFSET_Z

        );



        marsScene.scale.setScalar(
            MARS_WORLD_SCALE
        );



        marsScene.rotation.y =
            THREE.MathUtils.degToRad(
                MARS_WORLD_ROTATION_Y
            );



        /*
            Mars first or portal first here does not matter.
            renderOrder controls rendering.
        */


        contentGroup.add(
            marsScene
        );


        contentGroup.add(
            portalScene
        );



        /* =================================================
           FIND MASK
        ================================================= */


        portalMask =

            portalScene.getObjectByName(
                MASK_OBJECT_NAME
            );



        if (
            !portalMask
        ) {


            throw new Error(

                "Portalbox.glb loaded, but no Blender object named PortalMask was found."

            );


        }



        console.log(

            "PortalMask found:",

            portalMask

        );



        /* =================================================
           CONFIGURE STENCIL
        ================================================= */


        configurePortalMask();



        configureMarsWorld();



        configurePortalFrame();



        /* =================================================
           PORTAL SIZE
        ================================================= */


        portalScene.updateMatrixWorld(
            true
        );



        const portalBounds =

            new THREE.Box3()
                .setFromObject(
                    portalScene
                );



        const portalSize =

            portalBounds.getSize(
                new THREE.Vector3()
            );



        const portalCenter =

            portalBounds.getCenter(
                new THREE.Vector3()
            );



        if (

            !Number.isFinite(
                portalSize.y
            )

            ||

            portalSize.y <= 0

        ) {


            throw new Error(

                "Portal model has invalid dimensions."

            );


        }



        /* =================================================
           MOVE PORTAL BOTTOM CENTER TO ORIGIN

           Because world and portal are in contentGroup,
           both move together.
        ================================================= */


        contentGroup.position.x -=
            portalCenter.x;


        contentGroup.position.y -=
            portalBounds.min.y;


        contentGroup.position.z -=
            portalCenter.z;



        /* =================================================
           SCALE PORTAL TO ABOUT 2.2 METERS TALL
        ================================================= */


        const baseScale =

            TARGET_PORTAL_HEIGHT /
            portalSize.y;



        contentGroup.scale.setScalar(
            baseScale
        );



        portalRoot.visible =
            false;



        scene.add(
            portalRoot
        );



        /* =================================================
           ANIMATIONS
        ================================================= */


        if (

            portalGLTF.animations

            &&

            portalGLTF.animations.length > 0

        ) {


            portalMixer =

                new THREE.AnimationMixer(
                    portalScene
                );



            portalGLTF.animations.forEach(

                function (clip) {


                    portalMixer
                        .clipAction(
                            clip
                        )
                        .play();


                }

            );


        }



        if (

            marsGLTF.animations

            &&

            marsGLTF.animations.length > 0

        ) {


            marsMixer =

                new THREE.AnimationMixer(
                    marsScene
                );



            marsGLTF.animations.forEach(

                function (clip) {


                    marsMixer
                        .clipAction(
                            clip
                        )
                        .play();


                }

            );


        }



        experienceReady =
            true;



        supportMessage.textContent =

            "Portal and Mars world loaded successfully.";



        supportMessage.className =
            "support-message good";



        checkWebXRSupport();


    }

    catch (
        error
    ) {


        console.error(

            "Mars Portal loading error:",

            error

        );



        supportMessage.textContent =

            error.message;



        supportMessage.className =
            "support-message bad";



        startARButton.disabled =
            true;


    }


}



/* =========================================================
   PORTAL MASK

   Invisible to the camera,
   but writes 1 into stencil buffer.
========================================================= */


function configurePortalMask() {


    portalMask.frustumCulled =
        false;



    portalMask.renderOrder =
        1;



    portalMask.material =

        new THREE.MeshBasicMaterial({

            color:
                0xff00ff,

            /*
                FALSE = invisible.

                TRUE = bright pink debugging mask.
            */

            colorWrite:
                SHOW_MASK_FOR_DEBUG,

            depthWrite:
                false,

            depthTest:
                false,

            side:
                THREE.DoubleSide,



            stencilWrite:
                true,

            stencilRef:
                1,

            stencilFunc:
                THREE.AlwaysStencilFunc,

            stencilFail:
                THREE.KeepStencilOp,

            stencilZFail:
                THREE.KeepStencilOp,

            stencilZPass:
                THREE.ReplaceStencilOp

        });


}



/* =========================================================
   MARS WORLD

   Only render wherever stencil = 1.
========================================================= */


function configureMarsWorld() {


    marsScene.traverse(

        function (
            child
        ) {


            if (
                !child.isMesh
            ) {


                return;


            }



            child.frustumCulled =
                false;



            child.renderOrder =
                2;



            if (
                Array.isArray(
                    child.material
                )
            ) {


                child.material =

                    child.material.map(

                        prepareMarsMaterial

                    );


            }

            else if (
                child.material
            ) {


                child.material =

                    prepareMarsMaterial(
                        child.material
                    );


            }


        }

    );


}



/* =========================================================
   CLONE MATERIAL + ADD STENCIL
========================================================= */


function prepareMarsMaterial(
    originalMaterial
) {


    const material =
        originalMaterial.clone();



    material.stencilWrite =
        true;



    material.stencilRef =
        1;



    material.stencilFunc =
        THREE.EqualStencilFunc;



    material.stencilFail =
        THREE.KeepStencilOp;



    material.stencilZFail =
        THREE.KeepStencilOp;



    material.stencilZPass =
        THREE.KeepStencilOp;



    material.needsUpdate =
        true;



    return material;


}



/* =========================================================
   PORTAL FRAME

   Everything except PortalMask renders normally.
========================================================= */


function configurePortalFrame() {


    portalScene.traverse(

        function (
            child
        ) {


            if (
                !child.isMesh
            ) {


                return;


            }



            if (
                child ===
                portalMask
            ) {


                return;


            }



            child.frustumCulled =
                false;



            child.renderOrder =
                3;


        }

    );


}



/* =========================================================
   WEBXR SUPPORT
========================================================= */


async function checkWebXRSupport() {


    if (
        !experienceReady
    ) {


        return;


    }



    if (
        !window.isSecureContext
    ) {


        supportMessage.textContent =

            "AR requires HTTPS. Open the published GitHub Pages URL.";



        supportMessage.className =
            "support-message bad";



        startARButton.disabled =
            true;



        return;


    }



    if (
        !navigator.xr
    ) {


        supportMessage.textContent =

            "WebXR is not available. Use Chrome on a supported Android device.";



        supportMessage.className =
            "support-message warning";



        startARButton.disabled =
            true;



        return;


    }



    try {


        const supported =

            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );



        if (
            supported
        ) {


            startARButton.disabled =
                false;



            supportMessage.textContent =

                "Mars Portal loaded — tap START MARS PORTAL AR.";



            supportMessage.className =
                "support-message good";


        }

        else {


            startARButton.disabled =
                true;



            supportMessage.textContent =

                "This phone does not report immersive WebXR AR support.";



            supportMessage.className =
                "support-message warning";


        }


    }

    catch (
        error
    ) {


        console.error(
            error
        );



        supportMessage.textContent =

            "Could not confirm WebXR support.";



        supportMessage.className =
            "support-message bad";


    }


}



/* =========================================================
   START AR
========================================================= */


async function startAR() {


    if (
        !experienceReady
    ) {


        alert(

            "Portal models are still loading."

        );


        return;


    }



    if (
        !navigator.xr
    ) {


        alert(

            "WebXR is not available on this browser."

        );


        return;


    }



    try {


        xrSession =

            await navigator.xr.requestSession(

                "immersive-ar",

                {

                    requiredFeatures: [

                        "hit-test"

                    ],

                    optionalFeatures: [

                        "dom-overlay",

                        "local-floor"

                    ],

                    domOverlay: {

                        root:
                            document.body

                    }

                }

            );



        document.body.classList.add(
            "ar-active"
        );



        await renderer.xr.setSession(
            xrSession
        );



        viewerReferenceSpace =

            await xrSession.requestReferenceSpace(
                "viewer"
            );



        localReferenceSpace =

            await xrSession.requestReferenceSpace(
                "local"
            );



        hitTestSource =

            await xrSession.requestHitTestSource({

                space:
                    viewerReferenceSpace

            });



        xrSession.addEventListener(

            "end",

            onSessionEnded

        );



        portalPlaced =
            false;


        userScale =
            1;


        modelRotation =
            0;



        portalRoot.visible =
            false;



        reticle.visible =
            false;



        arControls.classList.remove(
            "visible"
        );



        placementMessage.classList.remove(
            "hidden"
        );



        animationClock.start();



        renderer.setAnimationLoop(
            render
        );


    }

    catch (
        error
    ) {


        console.error(

            "Could not start AR:",

            error

        );



        alert(

            "AR could not start. Check Chrome, camera permissions and WebXR support."

        );


    }


}



/* =========================================================
   RENDER
========================================================= */


function render(
    timestamp,
    frame
) {


    const delta =
        animationClock.getDelta();



    if (
        portalMixer
    ) {


        portalMixer.update(
            delta
        );


    }



    if (
        marsMixer
    ) {


        marsMixer.update(
            delta
        );


    }



    /* =====================================================
       HIT TEST
    ===================================================== */


    if (

        frame

        &&

        hitTestSource

        &&

        localReferenceSpace

        &&

        !portalPlaced

    ) {


        const results =

            frame.getHitTestResults(
                hitTestSource
            );



        if (
            results.length > 0
        ) {


            const pose =

                results[0].getPose(
                    localReferenceSpace
                );



            if (
                pose
            ) {


                reticle.visible =
                    true;



                reticle.matrix.fromArray(
                    pose.transform.matrix
                );



                arStatus.textContent =

                    "Floor found — tap to place the Mars portal";



                placementMessage.innerHTML = `

                    <div class="scan-icon">
                        ◎
                    </div>

                    <strong>
                        TAP TO PLACE
                    </strong>

                    <span>
                        Place the portal here
                    </span>

                `;


            }


        }

        else {


            reticle.visible =
                false;



            arStatus.textContent =

                "Move your phone slowly to find the floor";


        }


    }



    /* =====================================================
       RETICLE PULSE
    ===================================================== */


    if (
        reticle.visible
    ) {


        const pulse =

            1

            +

            Math.sin(
                timestamp *
                .005
            )

            *

            .08;



        reticle.scale.set(

            pulse,

            pulse,

            pulse

        );


    }



    renderer.render(

        scene,

        camera

    );


}



/* =========================================================
   TAP TO PLACE
========================================================= */


function onSelect() {


    if (

        !reticle

        ||

        !reticle.visible

        ||

        !portalRoot

    ) {


        return;


    }



    const position =
        new THREE.Vector3();


    const quaternion =
        new THREE.Quaternion();


    const scale =
        new THREE.Vector3();



    reticle.matrix.decompose(

        position,

        quaternion,

        scale

    );



    portalRoot.position.copy(
        position
    );



    portalRoot.rotation.set(

        0,

        modelRotation,

        0

    );



    portalRoot.scale.setScalar(
        userScale
    );



    portalRoot.visible =
        true;



    portalPlaced =
        true;



    reticle.visible =
        false;



    placementMessage.classList.add(
        "hidden"
    );



    arControls.classList.add(
        "visible"
    );



    arStatus.textContent =

        "Mars Portal placed — move around and look through it";


}



/* =========================================================
   ROTATE
========================================================= */


function rotatePortal() {


    if (
        !portalPlaced
    ) {


        return;


    }



    modelRotation +=

        THREE.MathUtils.degToRad(
            30
        );



    portalRoot.rotation.y =
        modelRotation;


}



/* =========================================================
   SMALLER
========================================================= */


function makeSmaller() {


    if (
        !portalPlaced
    ) {


        return;


    }



    userScale =

        Math.max(

            MIN_USER_SCALE,

            userScale -
            .1

        );



    portalRoot.scale.setScalar(
        userScale
    );


}



/* =========================================================
   LARGER
========================================================= */


function makeLarger() {


    if (
        !portalPlaced
    ) {


        return;


    }



    userScale =

        Math.min(

            MAX_USER_SCALE,

            userScale +
            .15

        );



    portalRoot.scale.setScalar(
        userScale
    );


}



/* =========================================================
   PLACE AGAIN
========================================================= */


function placeAgain() {


    portalRoot.visible =
        false;



    portalPlaced =
        false;



    reticle.visible =
        false;



    arControls.classList.remove(
        "visible"
    );



    placementMessage.classList.remove(
        "hidden"
    );



    placementMessage.innerHTML = `

        <div class="scan-icon">
            ◎
        </div>

        <strong>
            FIND A NEW LOCATION
        </strong>

        <span>
            Move your phone to detect another surface
        </span>

    `;


}



/* =========================================================
   EXIT
========================================================= */


async function exitAR() {


    if (
        xrSession
    ) {


        await xrSession.end();


    }


}



/* =========================================================
   SESSION ENDED
========================================================= */


function onSessionEnded() {


    renderer.setAnimationLoop(
        null
    );



    if (
        hitTestSource
    ) {


        try {


            hitTestSource.cancel();


        }

        catch (
            error
        ) {


            console.warn(
                error
            );


        }


    }



    hitTestSource =
        null;


    xrSession =
        null;


    viewerReferenceSpace =
        null;


    localReferenceSpace =
        null;



    portalPlaced =
        false;



    if (
        portalRoot
    ) {


        portalRoot.visible =
            false;


    }



    reticle.visible =
        false;



    arControls.classList.remove(
        "visible"
    );



    document.body.classList.remove(
        "ar-active"
    );


}



/* =========================================================
   RESIZE
========================================================= */


function onWindowResize() {


    if (

        !camera

        ||

        !renderer

    ) {


        return;


    }



    camera.aspect =

        window.innerWidth /
        window.innerHeight;



    camera.updateProjectionMatrix();



    renderer.setSize(

        window.innerWidth,

        window.innerHeight

    );


}



/* =========================================================
   EVENTS
========================================================= */


startARButton.addEventListener(

    "click",

    startAR

);


rotateButton.addEventListener(

    "click",

    rotatePortal

);


smallerButton.addEventListener(

    "click",

    makeSmaller

);


largerButton.addEventListener(

    "click",

    makeLarger

);


replaceButton.addEventListener(

    "click",

    placeAgain

);


exitARButton.addEventListener(

    "click",

    exitAR

);



/* =========================================================
   START
========================================================= */


initializePage();