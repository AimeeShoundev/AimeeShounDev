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
   FILE PATHS
========================================================= */


const PORTAL_MODEL_PATH =
    "./models/Portalbox.glb";


const MARS_MODEL_PATH =
    "./models/MarsBackground.glb";


const PORTAL_MASK_NAME =
    "PortalMask";



/* =========================================================
   PORTAL SIZE
========================================================= */


/*
    Portal will be roughly doorway height.
*/

const TARGET_PORTAL_HEIGHT =
    2.2;



/* =========================================================
   MARS WORLD ADJUSTMENTS

   Change these if the Mars world needs moving.
========================================================= */


const MARS_OFFSET_X =
    0;


const MARS_OFFSET_Y =
    0;


const MARS_OFFSET_Z =
    -1;


const MARS_SCALE =
    1;


const MARS_ROTATION_Y =
    0;



/* =========================================================
   MASK DEBUG

   Change to true if you want to see
   PortalMask as a bright pink rectangle.
========================================================= */


const SHOW_MASK =
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
   DEVICE DETECTION
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
   THREE VARIABLES
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
   PORTAL VARIABLES
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


let portalMixer =
    null;


let marsMixer =
    null;


let experienceReady =
    false;


let portalPlaced =
    false;


let portalRotation =
    0;


let userScale =
    1;


const clock =
    new THREE.Clock();



/* =========================================================
   START PAGE
========================================================= */


function initializePage() {


    startARButton.disabled =
        true;



    /*
        iPHONE / iPAD

        We do not start WebXR.

        The HTML Quick Look buttons are used instead.
    */


    if (
        isIOS
    ) {


        iphoneCard.classList.add(
            "recommended"
        );



        startARButton.disabled =
            true;



        startARButton.innerHTML = `

            <span class="button-icon">
                ◉
            </span>

            ANDROID WEBXR PORTAL

        `;



        supportMessage.textContent =

            "iPhone/iPad detected — use one of the Apple AR buttons below.";



        supportMessage.className =
            "support-message good";



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
   CREATE THREE
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
        stencil:true IS REQUIRED
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

            0x442211,

            2.4

        );


    scene.add(
        hemisphere
    );



    const sunLight =
        new THREE.DirectionalLight(

            0xffd0a0,

            2.8

        );


    sunLight.position.set(

        4,

        7,

        4

    );


    scene.add(
        sunLight
    );



    const fillLight =
        new THREE.DirectionalLight(

            0x7799ff,

            1.1

        );


    fillLight.position.set(

        -4,

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

        placePortal

    );



    scene.add(
        controller
    );



    loadExperience();



    window.addEventListener(

        "resize",

        resize

    );


}



/* =========================================================
   RETICLE
========================================================= */


function createReticle() {


    const geometry =
        new THREE.RingGeometry(

            0.15,

            0.20,

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
   LOAD GLB
========================================================= */


function loadGLB(
    path
) {


    const loader =
        new GLTFLoader();



    return new Promise(

        (
            resolve,
            reject
        ) => {


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
   LOAD PORTAL + MARS
========================================================= */


async function loadExperience() {


    try {


        supportMessage.textContent =

            "Loading portal model...";



        const portalGLTF =

            await loadGLB(
                PORTAL_MODEL_PATH
            );



        portalScene =
            portalGLTF.scene;



        supportMessage.textContent =

            "Portal loaded. Loading Mars environment...";



        const marsGLTF =

            await loadGLB(
                MARS_MODEL_PATH
            );



        marsScene =
            marsGLTF.scene;



        /* =================================================
           ROOT
        ================================================= */


        portalRoot =
            new THREE.Group();



        portalRoot.name =
            "MarsPortalRoot";



        contentGroup =
            new THREE.Group();



        contentGroup.name =
            "PortalContent";



        portalRoot.add(
            contentGroup
        );



        /* =================================================
           MARS POSITION
        ================================================= */


        marsScene.position.set(

            MARS_OFFSET_X,

            MARS_OFFSET_Y,

            MARS_OFFSET_Z

        );



        marsScene.scale.setScalar(
            MARS_SCALE
        );



        marsScene.rotation.y =

            THREE.MathUtils.degToRad(
                MARS_ROTATION_Y
            );



        contentGroup.add(
            marsScene
        );



        contentGroup.add(
            portalScene
        );



        /* =================================================
           FIND PORTAL MASK
        ================================================= */


        portalMask =

            portalScene.getObjectByName(
                PORTAL_MASK_NAME
            );



        if (
            !portalMask
        ) {


            throw new Error(

                "Portalbox.glb loaded but there is no mesh named PortalMask."

            );


        }



        console.log(

            "PortalMask found:",

            portalMask

        );



        setupMask();



        setupMarsMaterials();



        setupPortalFrame();



        /* =================================================
           SCALE PORTAL TO DOORWAY HEIGHT
        ================================================= */


        portalScene.updateMatrixWorld(
            true
        );



        const bounds =

            new THREE.Box3()
                .setFromObject(
                    portalScene
                );



        const size =

            bounds.getSize(
                new THREE.Vector3()
            );



        const center =

            bounds.getCenter(
                new THREE.Vector3()
            );



        if (
            size.y <= 0
        ) {


            throw new Error(

                "Portal model has invalid height."

            );


        }



        /*
            Put bottom center of portal at origin.
        */


        contentGroup.position.x -=
            center.x;


        contentGroup.position.y -=
            bounds.min.y;


        contentGroup.position.z -=
            center.z;



        const baseScale =

            TARGET_PORTAL_HEIGHT /
            size.y;



        contentGroup.scale.setScalar(
            baseScale
        );



        portalRoot.visible =
            false;



        scene.add(
            portalRoot
        );



        /* =================================================
           PORTAL ANIMATIONS
        ================================================= */


        if (
            portalGLTF.animations.length >
            0
        ) {


            portalMixer =
                new THREE.AnimationMixer(
                    portalScene
                );



            portalGLTF.animations.forEach(

                clip => {

                    portalMixer
                        .clipAction(
                            clip
                        )
                        .play();

                }

            );


        }



        /* =================================================
           MARS ANIMATIONS
        ================================================= */


        if (
            marsGLTF.animations.length >
            0
        ) {


            marsMixer =
                new THREE.AnimationMixer(
                    marsScene
                );



            marsGLTF.animations.forEach(

                clip => {

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

            "Portal and Mars environment loaded.";



        supportMessage.className =
            "support-message good";



        checkARSupport();


    }

    catch (
        error
    ) {


        console.error(

            "Portal loading error:",

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

   Does not draw color.
   Writes stencil value 1.
========================================================= */


function setupMask() {


    portalMask.frustumCulled =
        false;



    portalMask.renderOrder =
        1;



    portalMask.material =

        new THREE.MeshBasicMaterial({

            color:
                0xff00ff,

            colorWrite:
                SHOW_MASK,

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
   MARS MATERIALS
========================================================= */


function setupMarsMaterials() {


    marsScene.traverse(

        child => {


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
                        makeStencilMaterial
                    );


            }

            else if (
                child.material
            ) {


                child.material =

                    makeStencilMaterial(
                        child.material
                    );


            }


        }

    );


}



/* =========================================================
   COPY MATERIAL + REQUIRE STENCIL 1
========================================================= */


function makeStencilMaterial(
    original
) {


    const material =
        original.clone();



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
========================================================= */


function setupPortalFrame() {


    portalScene.traverse(

        child => {


            if (
                !child.isMesh
            ) {

                return;

            }



            if (
                child === portalMask
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
   CHECK WEBXR
========================================================= */


async function checkARSupport() {


    if (
        !experienceReady
    ) {

        return;

    }



    if (
        !window.isSecureContext
    ) {


        supportMessage.textContent =

            "AR requires HTTPS.";



        supportMessage.className =
            "support-message bad";



        return;


    }



    if (
        !navigator.xr
    ) {


        supportMessage.textContent =

            "WebXR is unavailable. Android users should open this page in Chrome.";



        supportMessage.className =
            "support-message warning";



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

                "Mars Portal ready — tap START MARS PORTAL AR.";



            supportMessage.className =
                "support-message good";


        }

        else {


            startARButton.disabled =
                true;



            supportMessage.textContent =

                "This device does not report immersive WebXR AR support.";



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
            "Portal is still loading."
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

            sessionEnded

        );



        portalPlaced =
            false;



        portalRotation =
            0;



        userScale =
            1;



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



        clock.start();



        renderer.setAnimationLoop(
            render
        );


    }

    catch (
        error
    ) {


        console.error(

            "AR failed:",

            error

        );



        alert(

            "Could not start AR. Check camera permissions and Chrome/WebXR support."

        );


    }


}



/* =========================================================
   RENDER LOOP
========================================================= */


function render(
    timestamp,
    frame
) {


    const delta =
        clock.getDelta();



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



    if (

        frame

        &&

        hitTestSource

        &&

        localReferenceSpace

        &&

        !portalPlaced

    ) {


        const hits =

            frame.getHitTestResults(
                hitTestSource
            );



        if (
            hits.length >
            0
        ) {


            const pose =

                hits[0].getPose(
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

                    "Floor found — tap to place the portal";



                placementMessage.innerHTML = `

                    <div class="scan-icon">
                        ◎
                    </div>

                    <strong>
                        TAP TO PLACE
                    </strong>

                    <span>
                        Open the portal here
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



    if (
        reticle.visible
    ) {


        const pulse =

            1

            +

            Math.sin(
                timestamp *
                0.005
            )

            *

            0.08;



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
   PLACE PORTAL
========================================================= */


function placePortal() {


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

        portalRotation,

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

        "Portal opened — move around and look into Mars";


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



    portalRotation +=

        THREE.MathUtils.degToRad(
            30
        );



    portalRoot.rotation.y =
        portalRotation;


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
            0.1

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
            0.15

        );



    portalRoot.scale.setScalar(
        userScale
    );


}



/* =========================================================
   PLACE AGAIN
========================================================= */


function placeAgain() {


    if (
        !portalRoot
    ) {

        return;

    }



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
            Move your phone around
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


        try {


            await xrSession.end();


        }

        catch (
            error
        ) {


            console.error(
                error
            );


        }


    }


}



/* =========================================================
   SESSION END
========================================================= */


function sessionEnded() {


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


    viewerReferenceSpace =
        null;


    localReferenceSpace =
        null;


    xrSession =
        null;



    portalPlaced =
        false;



    if (
        portalRoot
    ) {


        portalRoot.visible =
            false;


    }



    if (
        reticle
    ) {


        reticle.visible =
            false;


    }



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


function resize() {


    if (
        !camera ||
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
   INITIALIZE
========================================================= */


initializePage();