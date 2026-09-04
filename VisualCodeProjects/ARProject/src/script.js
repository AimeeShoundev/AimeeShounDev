/* =========================================================
   ROBOT SPIDER AR
   SCRIPT.JS
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


/*
    Android / WebXR model
*/

const MODEL_PATH =
    "./models/Spiderwalk.glb";


/*
    iPhone / iPad Quick Look model

    You will need to create this USDZ file.
*/

const IOS_USDZ_PATH =
    "./models/RobotSpider.usdz";



/* =========================================================
   GIANT SPIDER SIZE
========================================================= */


/*
    Longest dimension will be about 4.5 meters.

    4.5 = huge
    6.0 = enormous
    8.0 = monster-sized
*/

const TARGET_MODEL_SIZE =
    4.5;


const MIN_USER_SCALE =
    0.15;


const MAX_USER_SCALE =
    4;



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


const iosQuickLookLink =
    document.getElementById(
        "iosQuickLookLink"
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


let robotSpider =
    null;


let robotSpiderVisual =
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

            100

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


    const hemisphere =
        new THREE.HemisphereLight(

            0xffffff,

            0x303040,

            2.8

        );


    scene.add(
        hemisphere
    );



    const mainLight =
        new THREE.DirectionalLight(

            0xffffff,

            2.5

        );


    mainLight.position.set(

        2,

        5,

        3

    );


    scene.add(
        mainLight
    );



    const fillLight =
        new THREE.DirectionalLight(

            0x88ccff,

            1.4

        );


    fillLight.position.set(

        -3,

        2,

        -2

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



    loadRobotSpider();



    window.addEventListener(

        "resize",

        onWindowResize

    );


}



/* =========================================================
   CREATE PLACEMENT RETICLE
========================================================= */


function createReticle() {


    const geometry =
        new THREE.RingGeometry(

            0.12,

            0.16,

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
   LOAD GLB
========================================================= */


function loadRobotSpider() {


    const loader =
        new GLTFLoader();



    supportMessage.textContent =
        "Loading Robot Spider 3D model...";



    loader.load(


        MODEL_PATH,


        function (gltf) {


            robotSpider =
                new THREE.Group();



            robotSpider.name =
                "RobotSpiderRoot";



            robotSpiderVisual =
                gltf.scene;



            robotSpiderVisual.traverse(

                function (child) {


                    if (
                        child.isMesh
                    ) {


                        child.frustumCulled =
                            false;


                    }


                }

            );



            /*
                Get original model bounds.
            */


            robotSpiderVisual.updateMatrixWorld(
                true
            );



            const originalBounds =
                new THREE.Box3()
                    .setFromObject(
                        robotSpiderVisual
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
                longestDimension <= 0
            ) {


                throw new Error(
                    "Robot Spider has invalid model dimensions."
                );


            }



            /*
                Scale it to giant AR size.
            */


            const modelScale =

                TARGET_MODEL_SIZE /
                longestDimension;



            robotSpiderVisual.scale.setScalar(
                modelScale
            );



            /*
                Recalculate bounds AFTER scaling.
            */


            robotSpiderVisual.updateMatrixWorld(
                true
            );



            const scaledBounds =
                new THREE.Box3()
                    .setFromObject(
                        robotSpiderVisual
                    );



            const scaledCenter =
                scaledBounds.getCenter(
                    new THREE.Vector3()
                );



            /*
                Center the spider over the placement point.
            */


            robotSpiderVisual.position.x -=
                scaledCenter.x;


            robotSpiderVisual.position.z -=
                scaledCenter.z;



            /*
                Put its feet / bottom on the floor.
            */


            robotSpiderVisual.position.y -=
                scaledBounds.min.y;



            robotSpider.add(
                robotSpiderVisual
            );



            robotSpider.visible =
                false;



            scene.add(
                robotSpider
            );



            /* =================================================
               MODEL ANIMATIONS
            ================================================= */


            if (
                gltf.animations &&
                gltf.animations.length >
                0
            ) {


                animationMixer =
                    new THREE.AnimationMixer(
                        robotSpiderVisual
                    );



                gltf.animations.forEach(

                    function (clip) {


                        animationMixer
                            .clipAction(
                                clip
                            )
                            .play();


                    }

                );


            }



            modelLoaded =
                true;



            console.log(
                "Robot Spider loaded successfully."
            );



            setupARButton();


        },



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

                    "Loading Robot Spider: " +
                    percent +
                    "%";


            }


        },



        function (error) {


            console.error(

                "Robot Spider GLB failed to load:",

                error

            );



            supportMessage.textContent =

                "Could not load ./models/Spiderwalk.glb. Check the models folder and filename.";



            supportMessage.className =
                "support-message bad";



            startARButton.disabled =
                true;


        }


    );


}



/* =========================================================
   SET UP START AR BUTTON
========================================================= */


async function setupARButton() {


    if (
        !modelLoaded
    ) {

        return;

    }



    /*
        =============================================
        iPHONE / iPAD
        =============================================
    */


    if (
        isIOS
    ) {


        startARButton.disabled =
            false;



        supportMessage.textContent =

            "iPhone/iPad detected. Tap START AR to open Apple AR Quick Look.";



        supportMessage.className =
            "support-message good";



        return;


    }



    /*
        =============================================
        ANDROID / WEBXR
        =============================================
    */


    if (
        !window.isSecureContext
    ) {


        supportMessage.textContent =

            "AR requires HTTPS. Open the live GitHub Pages URL on your phone.";



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

            "This browser does not provide WebXR AR. Try Chrome on a supported Android phone.";



        supportMessage.className =
            "support-message bad";



        startARButton.disabled =
            false;



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

                "Robot Spider is loaded. Your phone is ready for AR.";



            supportMessage.className =
                "support-message good";


        }

        else {


            startARButton.disabled =
                false;



            supportMessage.textContent =

                "This device does not report immersive WebXR AR support.";



            supportMessage.className =
                "support-message warning";


        }


    }

    catch (error) {


        console.error(
            error
        );



        startARButton.disabled =
            false;



        supportMessage.textContent =

            "Unable to automatically confirm AR support. Tap START AR to try.";



        supportMessage.className =
            "support-message warning";


    }


}



/* =========================================================
   START BUTTON
========================================================= */


async function startAR() {


    /*
        =====================================================
        iPHONE / iPAD
        =====================================================
    */


    if (
        isIOS
    ) {


        launchIOSQuickLook();


        return;


    }



    /*
        =====================================================
        ANDROID WEBXR
        =====================================================
    */


    await startWebXR();


}



/* =========================================================
   iPHONE QUICK LOOK
========================================================= */


async function launchIOSQuickLook() {


    try {


        /*
            Check whether the USDZ actually exists.
        */


        const response =

            await fetch(

                IOS_USDZ_PATH,

                {

                    method:
                        "HEAD",

                    cache:
                        "no-store"

                }

            );



        if (
            !response.ok
        ) {


            alert(

                "The iPhone AR model is not uploaded yet. Add models/RobotSpider.usdz to this project."

            );


            return;


        }



        iosQuickLookLink.click();


    }

    catch (error) {


        console.error(
            error
        );



        alert(

            "iPhone AR needs models/RobotSpider.usdz. The GLB file is used for Android WebXR."

        );


    }


}



/* =========================================================
   START ANDROID WEBXR
========================================================= */


async function startWebXR() {


    if (
        !window.isSecureContext
    ) {


        alert(

            "AR requires HTTPS. Open the live GitHub Pages link instead of a local file."

        );


        return;


    }



    if (
        !navigator.xr
    ) {


        alert(

            "This browser does not support WebXR AR. On Android, try the latest Chrome browser."

        );


        return;


    }



    if (
        !modelLoaded
    ) {


        alert(
            "The Robot Spider is still loading."
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



        modelPlaced =
            false;



        modelRotation =
            0;



        userScale =
            1;



        robotSpider.visible =
            false;



        animationClock.start();



        renderer.setAnimationLoop(
            render
        );


    }

    catch (error) {


        console.error(
            "AR session failed:",
            error
        );



        alert(

            "AR could not start. Make sure camera permissions are allowed and that Chrome/WebXR AR is supported on this Android phone."

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


    const delta =
        animationClock.getDelta();



    if (
        animationMixer
    ) {


        animationMixer.update(
            delta
        );


    }



    if (
        frame &&
        hitTestSource &&
        localReferenceSpace
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
                pose &&
                !modelPlaced
            ) {


                reticle.visible =
                    true;



                reticle.matrix.fromArray(
                    pose.transform.matrix
                );



                arStatus.textContent =

                    "Surface found — tap to place the giant Robot Spider";



                placementMessage.innerHTML = `

                    <div class="scan-icon">
                        ◎
                    </div>

                    <strong>
                        TAP TO PLACE
                    </strong>

                    <span>
                        Place the Robot Spider here
                    </span>

                `;


            }


        }

        else if (
            !modelPlaced
        ) {


            reticle.visible =
                false;



            arStatus.textContent =

                "Move your phone slowly to find a surface";


        }


    }



    if (
        reticle.visible
    ) {


        const pulse =

            1 +

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
        !reticle ||
        !reticle.visible ||
        !robotSpider
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



    robotSpider.position.copy(
        position
    );



    robotSpider.rotation.set(

        0,

        modelRotation,

        0

    );



    robotSpider.scale.setScalar(
        userScale
    );



    robotSpider.visible =
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

        "Robot Spider placed — walk around it to explore";


}



/* =========================================================
   ROTATE
========================================================= */


function rotateModel() {


    if (
        !modelPlaced ||
        !robotSpider
    ) {

        return;

    }



    modelRotation +=

        THREE.MathUtils.degToRad(
            30
        );



    robotSpider.rotation.y =
        modelRotation;


}



/* =========================================================
   SMALLER
========================================================= */


function makeSmaller() {


    if (
        !modelPlaced ||
        !robotSpider
    ) {

        return;

    }



    userScale =

        Math.max(

            MIN_USER_SCALE,

            userScale -
            0.15

        );



    robotSpider.scale.setScalar(
        userScale
    );


}



/* =========================================================
   LARGER
========================================================= */


function makeLarger() {


    if (
        !modelPlaced ||
        !robotSpider
    ) {

        return;

    }



    userScale =

        Math.min(

            MAX_USER_SCALE,

            userScale +
            0.25

        );



    robotSpider.scale.setScalar(
        userScale
    );


}



/* =========================================================
   PLACE AGAIN
========================================================= */


function placeAgain() {


    if (
        !robotSpider
    ) {

        return;

    }



    robotSpider.visible =
        false;



    modelPlaced =
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
            Aim at a surface and tap the placement ring
        </span>

    `;



    arStatus.textContent =

        "Find a new location for the Robot Spider";


}



/* =========================================================
   EXIT AR
========================================================= */


async function exitAR() {


    if (
        xrSession
    ) {


        try {


            await xrSession.end();


        }

        catch (error) {


            console.error(
                error
            );


        }


    }


}



/* =========================================================
   SESSION END
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



    reticle.visible =
        false;



    if (
        robotSpider
    ) {


        robotSpider.visible =
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


}



/* =========================================================
   RESIZE
========================================================= */


function onWindowResize() {


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
   BUTTON EVENTS
========================================================= */


startARButton.addEventListener(

    "click",

    startAR

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
   INITIALIZE
========================================================= */


startARButton.disabled =
    true;



createThreeJS();