/* =========================================================
   SOLAR SYSTEM AR
   SCRIPT.JS
========================================================= */


import * as THREE
from "three";


import {
    GLTFLoader
}
from "three/addons/loaders/GLTFLoader.js";



/* =========================================================
   MODEL
========================================================= */


/*
    Android WebXR model.

    Exact folder:

    SolarSystemAR/models/SolarSystem.glb
*/

const MODEL_PATH =
    "./models/SolarSystem.glb";



/* =========================================================
   AR SIZE
========================================================= */


/*
    This is the approximate longest dimension
    of the complete Solar System after placement.

    3 = smaller
    5 = large
    7 = very large
*/

const TARGET_MODEL_SIZE =
    5;


const MIN_USER_SCALE =
    0.15;


const MAX_USER_SCALE =
    5;



/* =========================================================
   HTML ELEMENTS
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


const exitARButton =
    document.getElementById(
        "exitARButton"
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


const canvas =
    document.getElementById(
        "arCanvas"
    );


const androidCard =
    document.getElementById(
        "androidCard"
    );


const iphoneCard =
    document.getElementById(
        "iphoneCard"
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


let reticle;

let controller;


let solarSystem =
    null;


let solarSystemVisual =
    null;


let animationMixer =
    null;


let modelLoaded =
    false;


let modelPlaced =
    false;


let modelRotation =
    0;


let userScale =
    1;


const animationClock =
    new THREE.Clock();



/* =========================================================
   INITIAL PAGE
========================================================= */


function initializePage() {


    startARButton.disabled =
        true;



    /*
        =============================================
        iPHONE / iPAD

        Do not need to download the GLB.

        iPhone uses the USDZ link in the HTML.
        =============================================
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

            ANDROID WEBXR

        `;



        supportMessage.textContent =

            "iPhone/iPad detected — use OPEN iPHONE AR below.";



        supportMessage.className =
            "support-message good";



        return;


    }



    /*
        Android gets the WebXR model.

        Desktop also initializes so the page can
        report whether WebXR exists.
    */


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
   CREATE THREE.JS
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

            150

        );



    renderer =
        new THREE.WebGLRenderer({

            canvas:
                canvas,

            alpha:
                true,

            antialias:
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



    renderer.xr.enabled =
        true;



    renderer.xr.setReferenceSpaceType(
        "local"
    );



    renderer.outputColorSpace =
        THREE.SRGBColorSpace;



    /* =====================================================
       LIGHTING
    ===================================================== */


    const hemisphereLight =
        new THREE.HemisphereLight(

            0xffffff,

            0x222233,

            2.5

        );



    scene.add(
        hemisphereLight
    );



    const mainLight =
        new THREE.DirectionalLight(

            0xffffff,

            2.8

        );



    mainLight.position.set(

        4,

        8,

        4

    );



    scene.add(
        mainLight
    );



    const fillLight =
        new THREE.DirectionalLight(

            0x6699ff,

            1.4

        );



    fillLight.position.set(

        -4,

        3,

        -3

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



    loadSolarSystem();



    window.addEventListener(

        "resize",

        onWindowResize

    );


}



/* =========================================================
   CREATE RETICLE
========================================================= */


function createReticle() {


    const geometry =
        new THREE.RingGeometry(

            0.14,

            0.18,

            64

        );



    geometry.rotateX(

        -Math.PI /
        2

    );



    const material =
        new THREE.MeshBasicMaterial({

            color:
                0x00e5ff,

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
   LOAD SOLAR SYSTEM GLB
========================================================= */


function loadSolarSystem() {


    const loader =
        new GLTFLoader();



    supportMessage.textContent =

        "Loading Solar System 3D model...";



    loader.load(


        MODEL_PATH,


        /*
            =============================================
            MODEL LOADED
            =============================================
        */


        function (gltf) {


            solarSystem =
                new THREE.Group();



            solarSystem.name =
                "SolarSystemRoot";



            solarSystemVisual =
                gltf.scene;



            /* =============================================
               PREPARE MESHES
            ============================================= */


            solarSystemVisual.traverse(

                function (child) {


                    if (
                        child.isMesh
                    ) {


                        child.frustumCulled =
                            false;



                        if (
                            child.material
                        ) {


                            child.material.needsUpdate =
                                true;


                        }


                    }


                }

            );



            /* =============================================
               ORIGINAL BOUNDS
            ============================================= */


            solarSystemVisual.updateMatrixWorld(
                true
            );



            const originalBounds =
                new THREE.Box3()
                    .setFromObject(
                        solarSystemVisual
                    );



            const originalSize =
                originalBounds.getSize(
                    new THREE.Vector3()
                );



            const longestDimension =
                Math.max(

                    originalSize.x,

                    originalSize.y,

                    originalSize.z

                );



            if (
                !Number.isFinite(
                    longestDimension
                )

                ||

                longestDimension <= 0
            ) {


                throw new Error(
                    "Solar System model has invalid dimensions."
                );


            }



            /* =============================================
               SCALE TO METERS
            ============================================= */


            const modelScale =

                TARGET_MODEL_SIZE /
                longestDimension;



            solarSystemVisual.scale.setScalar(
                modelScale
            );



            solarSystemVisual.updateMatrixWorld(
                true
            );



            /* =============================================
               NEW BOUNDS AFTER SCALE
            ============================================= */


            const scaledBounds =
                new THREE.Box3()
                    .setFromObject(
                        solarSystemVisual
                    );



            const scaledCenter =
                scaledBounds.getCenter(
                    new THREE.Vector3()
                );



            /*
                Center X and Z around the AR placement point.
            */


            solarSystemVisual.position.x -=
                scaledCenter.x;


            solarSystemVisual.position.z -=
                scaledCenter.z;



            /*
                Put the lowest part of the model
                at the detected surface.
            */


            solarSystemVisual.position.y -=
                scaledBounds.min.y;



            solarSystem.add(
                solarSystemVisual
            );



            solarSystem.visible =
                false;



            scene.add(
                solarSystem
            );



            /* =============================================
               GLB ANIMATIONS

               If your Blender Solar System already contains
               planet animation, it will automatically play.
            ============================================= */


            if (

                gltf.animations

                &&

                gltf.animations.length >
                0

            ) {


                animationMixer =
                    new THREE.AnimationMixer(
                        solarSystemVisual
                    );



                gltf.animations.forEach(

                    function (clip) {


                        const action =

                            animationMixer
                                .clipAction(
                                    clip
                                );



                        action.play();


                    }

                );


            }



            modelLoaded =
                true;



            console.log(

                "Solar System GLB loaded successfully."

            );



            checkWebXRSupport();


        },



        /*
            =============================================
            LOAD PROGRESS
            =============================================
        */


        function (progress) {


            if (
                progress.total >
                0
            ) {


                const percent =

                    Math.round(

                        (
                            progress.loaded /
                            progress.total
                        )

                        *

                        100

                    );



                supportMessage.textContent =

                    "Loading Solar System: " +
                    percent +
                    "%";


            }


        },



        /*
            =============================================
            LOAD ERROR
            =============================================
        */


        function (error) {


            console.error(

                "Solar System model failed to load:",

                error

            );



            supportMessage.textContent =

                "Could not load models/SolarSystem.glb. Check the filename and models folder.";



            supportMessage.className =
                "support-message bad";



            startARButton.disabled =
                true;


        }


    );


}



/* =========================================================
   CHECK WEBXR
========================================================= */


async function checkWebXRSupport() {


    if (
        !modelLoaded
    ) {


        return;


    }



    /* =============================================
       HTTPS IS REQUIRED
    ============================================= */


    if (
        !window.isSecureContext
    ) {


        supportMessage.textContent =

            "AR requires HTTPS. Open the published GitHub Pages version on your Android phone.";



        supportMessage.className =
            "support-message bad";



        startARButton.disabled =
            true;



        return;


    }



    /* =============================================
       DOES BROWSER HAVE WEBXR?
    ============================================= */


    if (
        !navigator.xr
    ) {


        startARButton.disabled =
            true;



        if (
            isAndroid
        ) {


            supportMessage.textContent =

                "WebXR AR is not available in this browser. Try opening the page in Chrome on Android.";


        }

        else {


            supportMessage.textContent =

                "Desktop detected. Scan the QR code and open this experience on a phone.";


        }



        supportMessage.className =
            "support-message warning";



        return;


    }



    /* =============================================
       IMMERSIVE AR SUPPORT
    ============================================= */


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

                "Solar System loaded — your device is ready for AR.";



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

    catch (error) {


        console.error(

            "WebXR support check failed:",

            error

        );



        startARButton.disabled =
            true;



        supportMessage.textContent =

            "Unable to confirm WebXR AR support on this device.";



        supportMessage.className =
            "support-message bad";


    }


}



/* =========================================================
   START WEBXR AR
========================================================= */


async function startWebXR() {


    if (
        isIOS
    ) {


        return;


    }



    if (
        !modelLoaded
    ) {


        alert(

            "The Solar System model is still loading."

        );


        return;


    }



    if (
        !window.isSecureContext
    ) {


        alert(

            "AR requires HTTPS. Open the published GitHub Pages URL."

        );


        return;


    }



    if (
        !navigator.xr
    ) {


        alert(

            "This browser does not support WebXR augmented reality."

        );


        return;


    }



    try {


        const supported =

            await navigator.xr.isSessionSupported(
                "immersive-ar"
            );



        if (
            !supported
        ) {


            alert(

                "This device does not support immersive WebXR AR."

            );


            return;


        }



        /* =============================================
           REQUEST AR SESSION
        ============================================= */


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



        /* =============================================
           PAGE INTO AR MODE
        ============================================= */


        document.body.classList.add(
            "ar-active"
        );



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
                FIND A SURFACE
            </strong>

            <span>
                Slowly move your phone around
            </span>

        `;



        arStatus.textContent =

            "Move your phone to find a surface";



        /* =============================================
           CONNECT THREE.JS TO XR SESSION
        ============================================= */


        await renderer.xr.setSession(
            xrSession
        );



        /* =============================================
           REFERENCE SPACES
        ============================================= */


        viewerReferenceSpace =

            await xrSession.requestReferenceSpace(
                "viewer"
            );



        localReferenceSpace =

            await xrSession.requestReferenceSpace(
                "local"
            );



        /* =============================================
           HIT TEST
        ============================================= */


        hitTestSource =

            await xrSession.requestHitTestSource({

                space:
                    viewerReferenceSpace

            });



        xrSession.addEventListener(

            "end",

            onSessionEnded

        );



        /* =============================================
           RESET MODEL
        ============================================= */


        modelPlaced =
            false;



        modelRotation =
            0;



        userScale =
            1;



        solarSystem.position.set(

            0,

            0,

            0

        );



        solarSystem.rotation.set(

            0,

            0,

            0

        );



        solarSystem.scale.setScalar(
            1
        );



        solarSystem.visible =
            false;



        reticle.visible =
            false;



        animationClock.start();



        renderer.setAnimationLoop(
            render
        );


    }

    catch (error) {


        console.error(

            "Could not start AR session:",

            error

        );



        document.body.classList.remove(
            "ar-active"
        );



        alert(

            "AR could not start. Check camera permissions and make sure you are using a supported Android browser."

        );


    }


}



/* =========================================================
   WEBXR FRAME
========================================================= */


function render(
    timestamp,
    frame
) {


    /* =============================================
       UPDATE GLB ANIMATION
    ============================================= */


    const delta =
        animationClock.getDelta();



    if (
        animationMixer
    ) {


        animationMixer.update(
            delta
        );


    }



    /* =============================================
       HIT TEST
    ============================================= */


    if (

        frame

        &&

        hitTestSource

        &&

        localReferenceSpace

        &&

        !modelPlaced

    ) {


        const hitResults =

            frame.getHitTestResults(
                hitTestSource
            );



        if (
            hitResults.length >
            0
        ) {


            const pose =

                hitResults[0]
                    .getPose(
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

                    "Surface found — tap to place the Solar System";



                placementMessage.innerHTML = `

                    <div class="scan-icon">
                        ◎
                    </div>

                    <strong>
                        TAP TO PLACE
                    </strong>

                    <span>
                        Place the Solar System here
                    </span>

                `;


            }


        }

        else {


            reticle.visible =
                false;



            arStatus.textContent =

                "Move your phone slowly to find a surface";



            placementMessage.innerHTML = `

                <div class="scan-icon">
                    ◎
                </div>

                <strong>
                    FIND A SURFACE
                </strong>

                <span>
                    Slowly move your phone around
                </span>

            `;


        }


    }



    /* =============================================
       RETICLE PULSE
    ============================================= */


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
   TAP TO PLACE
========================================================= */


function onSelect() {


    if (

        !reticle

        ||

        !reticle.visible

        ||

        !solarSystem

        ||

        modelPlaced

    ) {


        return;


    }



    const position =
        new THREE.Vector3();



    const quaternion =
        new THREE.Quaternion();



    const reticleScale =
        new THREE.Vector3();



    reticle.matrix.decompose(

        position,

        quaternion,

        reticleScale

    );



    /* =============================================
       PLACE MODEL
    ============================================= */


    solarSystem.position.copy(
        position
    );



    solarSystem.rotation.set(

        0,

        modelRotation,

        0

    );



    solarSystem.scale.setScalar(
        userScale
    );



    solarSystem.visible =
        true;



    modelPlaced =
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

        "Solar System placed — walk around it to explore";


}



/* =========================================================
   ROTATE
========================================================= */


function rotateModel() {


    if (

        !solarSystem

        ||

        !modelPlaced

    ) {


        return;


    }



    modelRotation +=

        THREE.MathUtils.degToRad(
            30
        );



    solarSystem.rotation.y =
        modelRotation;


}



/* =========================================================
   SMALLER
========================================================= */


function makeSmaller() {


    if (

        !solarSystem

        ||

        !modelPlaced

    ) {


        return;


    }



    userScale =

        Math.max(

            MIN_USER_SCALE,

            userScale -
            0.15

        );



    solarSystem.scale.setScalar(
        userScale
    );


}



/* =========================================================
   LARGER
========================================================= */


function makeLarger() {


    if (

        !solarSystem

        ||

        !modelPlaced

    ) {


        return;


    }



    userScale =

        Math.min(

            MAX_USER_SCALE,

            userScale +
            0.25

        );



    solarSystem.scale.setScalar(
        userScale
    );


}



/* =========================================================
   PLACE AGAIN
========================================================= */


function placeAgain() {


    if (
        !solarSystem
    ) {


        return;


    }



    solarSystem.visible =
        false;



    modelPlaced =
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
            Move your phone and choose another surface
        </span>

    `;



    arStatus.textContent =

        "Find a new location for the Solar System";


}



/* =========================================================
   EXIT AR
========================================================= */


async function exitAR() {


    if (
        !xrSession
    ) {


        return;


    }



    try {


        await xrSession.end();


    }

    catch (error) {


        console.error(

            "Could not end AR session:",

            error

        );


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

        catch (error) {


            console.warn(

                "Could not cancel hit test source:",

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



    if (
        reticle
    ) {


        reticle.visible =
            false;


    }



    if (
        solarSystem
    ) {


        solarSystem.visible =
            false;


    }



    modelPlaced =
        false;



    document.body.classList.remove(
        "ar-active"
    );



    arControls.classList.remove(
        "visible"
    );



    placementMessage.classList.remove(
        "hidden"
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
   BUTTON EVENTS
========================================================= */


startARButton.addEventListener(

    "click",

    startWebXR

);



exitARButton.addEventListener(

    "click",

    exitAR

);



rotateButton.addEventListener(

    "click",

    rotateModel

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



/* =========================================================
   START PAGE
========================================================= */


initializePage();