/* =========================================================
   ROBOT SPIDER AR
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


const MODEL_PATH =
    "./models/Spiderwalk.glb";



/*
    Giant spider size in meters.

    4.5 = huge
    6 = very huge
    8 = monster size
*/


const TARGET_MODEL_SIZE =
    4.5;



const MAX_USER_SCALE =
    4;


const MIN_USER_SCALE =
    0.15;



/* =========================================================
   ELEMENTS
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



/* =========================================================
   THREE.JS VARIABLES
========================================================= */


let scene;

let camera;

let renderer;

let xrSession;


let viewerReferenceSpace;

let localReferenceSpace;

let hitTestSource;


let reticle;

let controller;


let robotSpider;

let robotSpiderVisual;


let modelLoaded =
    false;


let modelPlaced =
    false;


let modelRotation =
    0;


let userScale =
    1;


let animationMixer =
    null;


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


    const hemi =
        new THREE.HemisphereLight(

            0xffffff,

            0x333344,

            2.6

        );


    scene.add(
        hemi
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



    const fill =
        new THREE.DirectionalLight(

            0x88ccff,

            1.2

        );


    fill.position.set(

        -3,

        2,

        -2

    );


    scene.add(
        fill
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
   RETICLE
========================================================= */


function createReticle() {


    const geometry =
        new THREE.RingGeometry(

            0.12,

            0.15,

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
   LOAD MODEL
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



            robotSpiderVisual.updateMatrixWorld(
                true
            );



            const originalBox =
                new THREE.Box3()
                    .setFromObject(
                        robotSpiderVisual
                    );



            const originalSize =
                originalBox.getSize(
                    new THREE.Vector3()
                );



            const originalCenter =
                originalBox.getCenter(
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
                    "Invalid model size."
                );


            }



            const modelScale =

                TARGET_MODEL_SIZE /
                longestDimension;



            robotSpiderVisual.scale.setScalar(
                modelScale
            );



            robotSpiderVisual.position.x =

                -originalCenter.x *
                modelScale;



            robotSpiderVisual.position.z =

                -originalCenter.z *
                modelScale;



            robotSpiderVisual.position.y =

                -originalBox.min.y *
                modelScale;



            robotSpider.add(
                robotSpiderVisual
            );



            robotSpider.visible =
                false;



            scene.add(
                robotSpider
            );



            /* =================================================
               PLAY ANIMATIONS IF THE GLB HAS THEM
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



            checkARSupport();


            console.log(
                "Robot Spider loaded."
            );


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
                error
            );



            supportMessage.textContent =

                "Could not load models/Spiderwalk.glb. Check that the GLB is inside the models folder and the filename matches exactly.";



            supportMessage.classList.add(
                "bad"
            );



            startARButton.disabled =
                true;


        }


    );


}



/* =========================================================
   CHECK AR
========================================================= */


async function checkARSupport() {


    if (
        !modelLoaded
    ) {

        return;

    }



    if (
        !window.isSecureContext
    ) {


        supportMessage.textContent =

            "Robot Spider loaded. AR requires HTTPS. Test the live GitHub Pages version on your phone.";



        supportMessage.classList.add(
            "bad"
        );


        startARButton.disabled =
            true;


        return;


    }



    if (
        !navigator.xr
    ) {


        supportMessage.textContent =

            "Robot Spider loaded, but this browser does not support WebXR AR.";



        supportMessage.classList.add(
            "bad"
        );


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


            supportMessage.textContent =

                "Robot Spider loaded. Your device is ready for AR.";



            supportMessage.classList.remove(
                "bad"
            );


            supportMessage.classList.add(
                "good"
            );


            startARButton.disabled =
                false;


        }

        else {


            supportMessage.textContent =

                "Immersive AR is not supported on this device/browser.";



            supportMessage.classList.add(
                "bad"
            );


            startARButton.disabled =
                true;


        }


    }

    catch (error) {


        console.error(
            error
        );


        supportMessage.textContent =
            "Unable to check AR support.";


    }


}



/* =========================================================
   START AR
========================================================= */


async function startAR() {


    if (
        !modelLoaded
    ) {


        alert(
            "Robot Spider is still loading."
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

                        "dom-overlay"

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



        placementMessage.classList.remove(
            "hidden"
        );



        arControls.classList.remove(
            "visible"
        );



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
            error
        );


        alert(
            "AR could not start. Make sure camera permission is allowed and use a supported Android browser."
        );


    }


}



/* =========================================================
   XR RENDER
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
                        Spawn the giant Robot Spider here
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
        reticle &&
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
        !reticle.visible
    ) {

        return;

    }



    if (
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

        "Giant Robot Spider placed — walk around it to explore";


}



/* =========================================================
   ROTATE
========================================================= */


function rotateModel() {


    if (
        !robotSpider ||
        !modelPlaced
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
        !robotSpider ||
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



    robotSpider.scale.setScalar(
        userScale
    );


}



/* =========================================================
   LARGER
========================================================= */


function makeLarger() {


    if (
        !robotSpider ||
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
            Aim at the floor and tap the placement ring
        </span>

    `;



    arStatus.textContent =

        "Find a new location for the Robot Spider";


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



    if (
        reticle
    ) {


        reticle.visible =
            false;


    }



    if (
        robotSpider
    ) {


        robotSpider.visible =
            false;


    }



    modelPlaced =
        false;


    modelRotation =
        0;


    userScale =
        1;



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
   START
========================================================= */


startARButton.disabled =
    true;


createThreeJS();