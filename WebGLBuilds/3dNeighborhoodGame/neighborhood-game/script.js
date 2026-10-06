import * as THREE from "three";

import {
    GLTFLoader
}
from "three/addons/loaders/GLTFLoader.js";


// ============================================================
// DOM
// ============================================================

const canvas =
    document.querySelector(
        ".webgl"
    );

const loadingScreen =
    document.querySelector(
        "#loadingScreen"
    );

const loadingText =
    document.querySelector(
        "#loadingText"
    );

const startScreen =
    document.querySelector(
        "#startScreen"
    );

const startGameButton =
    document.querySelector(
        "#startGameButton"
    );

const flowerCounter =
    document.querySelector(
        "#flowerCount"
    );

const objective =
    document.querySelector(
        "#objective"
    );

const flowerInfoModal =
    document.querySelector(
        "#flowerInfoModal"
    );

const flowerInfoTitle =
    document.querySelector(
        "#flowerInfoTitle"
    );

const flowerInfoText =
    document.querySelector(
        "#flowerInfoText"
    );

const closeFlowerInfo =
    document.querySelector(
        "#closeFlowerInfo"
    );

const returnToNeighborhood =
    document.querySelector(
        "#returnToNeighborhood"
    );


// ============================================================
// GAME STATE
// ============================================================

let gameStarted =
    false;

let gamePaused =
    false;


// ============================================================
// SCENE
// ============================================================

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(
        0x87ceeb
    );

scene.fog =
    new THREE.Fog(
        0x87ceeb,
        60,
        220
    );


// ============================================================
// CAMERA
// ============================================================

const camera =
    new THREE.PerspectiveCamera(
        60,
        window.innerWidth /
        window.innerHeight,
        0.1,
        500
    );

camera.position.set(
    0,
    4,
    8
);


// ============================================================
// RENDERER
// ============================================================

const renderer =
    new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);

renderer.shadowMap.enabled =
    true;

renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

renderer.outputColorSpace =
    THREE.SRGBColorSpace;


// ============================================================
// LIGHTS
// ============================================================

const hemisphereLight =
    new THREE.HemisphereLight(
        0xffffff,
        0x61774b,
        2
    );

scene.add(
    hemisphereLight
);


const sun =
    new THREE.DirectionalLight(
        0xffffff,
        2
    );

sun.position.set(
    30,
    45,
    25
);

sun.castShadow =
    true;

scene.add(
    sun
);


// ============================================================
// LOADING
// ============================================================

const loadingManager =
    new THREE.LoadingManager();


loadingManager.onProgress =
    (
        url,
        loaded,
        total
    ) => {

        if (
            loadingText
        ) {

            loadingText.textContent =
                `Loading ${loaded} / ${total}`;

        }

    };


loadingManager.onLoad =
    () => {

        if (
            loadingScreen
        ) {

            loadingScreen
                .classList
                .add(
                    "hidden"
                );

        }

    };


loadingManager.onError =
    (url) => {

        console.error(
            "Could not load:",
            url
        );

    };


const loader =
    new GLTFLoader(
        loadingManager
    );


// ============================================================
// NEIGHBORHOOD
// ============================================================

let neighborhood =
    null;


loader.load(

    "./assets/neighborhood.glb",

    (gltf) => {

        neighborhood =
            gltf.scene;


        neighborhood.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );


        scene.add(
            neighborhood
        );

    },

    undefined,

    (error) => {

        console.error(
            "Neighborhood error:",
            error
        );

    }

);


// ============================================================
// PLAYER
// ============================================================

const player =
    new THREE.Group();

scene.add(
    player
);

player.position.set(
    0,
    0,
    0
);


// ============================================================
// CHARACTER
// ============================================================

let characterModel =
    null;

let mixer =
    null;

let walkAction =
    null;

let isWalking =
    false;


loader.load(

    "./assets/character.glb",

    (gltf) => {

        characterModel =
            gltf.scene;


        characterModel.scale.set(
            0.3,
            0.3,
            0.3
        );


        characterModel.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );


        player.add(
            characterModel
        );


        if (
            gltf.animations &&
            gltf.animations.length > 0
        ) {

            mixer =
                new THREE.AnimationMixer(
                    characterModel
                );


            walkAction =
                mixer.clipAction(
                    gltf.animations[0]
                );


            walkAction.setLoop(
                THREE.LoopRepeat,
                Infinity
            );

        }

    },

    undefined,

    (error) => {

        console.error(
            "Character error:",
            error
        );

    }

);


// ============================================================
// FLOWER FACTS
// ============================================================

const flowerFacts = [

    {
        title:
            "What Is a Flower?",

        text:
            "A flower is the reproductive part of many plants. Flowers help plants produce seeds so new plants can grow."
    },

    {
        title:
            "Petals",

        text:
            "Petals are often brightly colored to attract pollinators such as bees, butterflies, birds, and other animals."
    },

    {
        title:
            "Pollination",

        text:
            "Pollination happens when pollen moves from one flower to another. This process helps many flowering plants produce seeds."
    },

    {
        title:
            "Pollen",

        text:
            "Pollen contains tiny grains involved in plant reproduction. Pollinators can carry pollen from one flower to another."
    },

    {
        title:
            "Nectar",

        text:
            "Many flowers produce nectar, a sweet liquid that attracts animals such as bees, butterflies, and hummingbirds."
    },

    {
        title:
            "Seeds",

        text:
            "After successful pollination and fertilization, many flowering plants produce seeds that can grow into new plants."
    },

    {
        title:
            "Flower Colors",

        text:
            "Flower colors, scents, shapes, and patterns can help attract different types of pollinators."
    },

    {
        title:
            "Bees and Flowers",

        text:
            "Bees are important pollinators. Pollen can stick to their bodies while they visit flowers and then travel to other flowers."
    },

    {
        title:
            "Flowers and Fruit",

        text:
            "In many plants, part of the flower develops into fruit after fertilization. Apples, tomatoes, pumpkins, and many other foods begin as flowers."
    },

    {
        title:
            "Flowers in Ecosystems",

        text:
            "Flowering plants provide food and habitat for many organisms and play an important role in healthy ecosystems."
    }

];


// ============================================================
// FLOWER SETTINGS
// ============================================================

const TOTAL_FLOWERS =
    10;

const FLOWER_PICKUP_DISTANCE =
    1.15;

const FLOWER_SCALE =
    0.32;

const FLOWER_MIN_X =
    -20;

const FLOWER_MAX_X =
    20;

const FLOWER_MIN_Z =
    -20;

const FLOWER_MAX_Z =
    20;


let flowerTemplate =
    null;

let flowers =
    [];

let flowerCount =
    0;


// ============================================================
// FLOWER UI
// ============================================================

function updateFlowerUI() {

    if (
        flowerCounter
    ) {

        flowerCounter.textContent =
            `${flowerCount} / ${TOTAL_FLOWERS}`;

    }


    if (
        objective
    ) {

        if (
            flowerCount <
            TOTAL_FLOWERS
        ) {

            objective.textContent =
                `Find the flowers! ${flowerCount} / ${TOTAL_FLOWERS}`;

        } else {

            objective.textContent =
                "You collected every flower! 🌸";

        }

    }

}


// ============================================================
// RANDOM FLOWER POSITION
// ============================================================

function createRandomFlowerPosition() {

    let x;
    let z;
    let valid =
        false;


    while (
        !valid
    ) {

        x =
            THREE.MathUtils.randFloat(
                FLOWER_MIN_X,
                FLOWER_MAX_X
            );


        z =
            THREE.MathUtils.randFloat(
                FLOWER_MIN_Z,
                FLOWER_MAX_Z
            );


        const distanceFromSpawn =
            Math.sqrt(
                x * x +
                z * z
            );


        valid =
            distanceFromSpawn >
            4;


        if (
            valid
        ) {

            for (
                const existingFlower
                of flowers
            ) {

                const dx =
                    x -
                    existingFlower.position.x;


                const dz =
                    z -
                    existingFlower.position.z;


                const flowerDistance =
                    Math.sqrt(
                        dx * dx +
                        dz * dz
                    );


                if (
                    flowerDistance <
                    3
                ) {

                    valid =
                        false;

                    break;

                }

            }

        }

    }


    return new THREE.Vector3(
        x,
        0,
        z
    );

}


// ============================================================
// SPAWN FLOWERS
// ============================================================

function spawnFlowers() {

    if (
        !flowerTemplate
    ) {

        return;

    }


    flowers =
        [];


    for (
        let i = 0;
        i < TOTAL_FLOWERS;
        i++
    ) {

        const flower =
            flowerTemplate.clone(
                true
            );


        flower.scale.set(
            FLOWER_SCALE,
            FLOWER_SCALE,
            FLOWER_SCALE
        );


        const position =
            createRandomFlowerPosition();


        flower.position.copy(
            position
        );


        flower.userData.collected =
            false;


        flower.userData.baseY =
            0;


        flower.userData.animationOffset =
            Math.random() *
            Math.PI *
            2;


        flower.traverse(
            (child) => {

                if (
                    child.isMesh
                ) {

                    child.castShadow =
                        true;

                    child.receiveShadow =
                        true;

                }

            }
        );


        scene.add(
            flower
        );


        flowers.push(
            flower
        );

    }


    updateFlowerUI();

}


// ============================================================
// LOAD FLOWER
// ============================================================

loader.load(

    "./assets/flower.glb",

    (gltf) => {

        flowerTemplate =
            gltf.scene;


        spawnFlowers();

    },

    undefined,

    (error) => {

        console.error(
            "Flower error:",
            error
        );

    }

);


// ============================================================
// GROUND
// ============================================================

const groundGeometry =
    new THREE.PlaneGeometry(
        300,
        300
    );


const groundMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x5c9c45,
        roughness: 1
    });


const ground =
    new THREE.Mesh(
        groundGeometry,
        groundMaterial
    );


ground.rotation.x =
    -Math.PI /
    2;


ground.position.y =
    -0.03;


ground.receiveShadow =
    true;


scene.add(
    ground
);


// ============================================================
// KEY INPUT
// ============================================================

const keys = {

    forward:
        false,

    backward:
        false,

    left:
        false,

    right:
        false,

    run:
        false

};


window.addEventListener(

    "keydown",

    (event) => {

        if (
            event.code === "Escape" &&
            gamePaused
        ) {

            hideFlowerInformation();

            return;

        }


        if (
            !gameStarted ||
            gamePaused
        ) {

            return;

        }


        if (
            event.code === "KeyW" ||
            event.code === "ArrowUp"
        ) {

            keys.forward =
                true;

        }


        if (
            event.code === "KeyS" ||
            event.code === "ArrowDown"
        ) {

            keys.backward =
                true;

        }


        if (
            event.code === "KeyA" ||
            event.code === "ArrowLeft"
        ) {

            keys.left =
                true;

        }


        if (
            event.code === "KeyD" ||
            event.code === "ArrowRight"
        ) {

            keys.right =
                true;

        }


        if (
            event.code === "ShiftLeft" ||
            event.code === "ShiftRight"
        ) {

            keys.run =
                true;

        }

    }

);


window.addEventListener(

    "keyup",

    (event) => {

        if (
            event.code === "KeyW" ||
            event.code === "ArrowUp"
        ) {

            keys.forward =
                false;

        }


        if (
            event.code === "KeyS" ||
            event.code === "ArrowDown"
        ) {

            keys.backward =
                false;

        }


        if (
            event.code === "KeyA" ||
            event.code === "ArrowLeft"
        ) {

            keys.left =
                false;

        }


        if (
            event.code === "KeyD" ||
            event.code === "ArrowRight"
        ) {

            keys.right =
                false;

        }


        if (
            event.code === "ShiftLeft" ||
            event.code === "ShiftRight"
        ) {

            keys.run =
                false;

        }

    }

);


// ============================================================
// START GAME
// ============================================================

startGameButton.addEventListener(

    "click",

    () => {

        gameStarted =
            true;


        startScreen
            .classList
            .add(
                "hidden"
            );

    }

);


// ============================================================
// FLOWER INFO
// ============================================================

function showFlowerInformation(
    flowerNumber
) {

    gamePaused =
        true;


    keys.forward =
        false;

    keys.backward =
        false;

    keys.left =
        false;

    keys.right =
        false;

    keys.run =
        false;


    updateWalkAnimation(
        false
    );


    const factIndex =
        (
            flowerNumber -
            1
        ) %
        flowerFacts.length;


    const fact =
        flowerFacts[
            factIndex
        ];


    flowerInfoTitle.textContent =
        fact.title;


    flowerInfoText.textContent =
        fact.text;


    flowerInfoModal
        .classList
        .remove(
            "modalHidden"
        );


    flowerInfoModal
        .classList
        .add(
            "modalVisible"
        );


    flowerInfoModal.setAttribute(
        "aria-hidden",
        "false"
    );

}


function hideFlowerInformation() {

    flowerInfoModal
        .classList
        .remove(
            "modalVisible"
        );


    flowerInfoModal
        .classList
        .add(
            "modalHidden"
        );


    flowerInfoModal.setAttribute(
        "aria-hidden",
        "true"
    );


    gamePaused =
        false;

}


closeFlowerInfo.addEventListener(
    "click",
    hideFlowerInformation
);


returnToNeighborhood.addEventListener(
    "click",
    hideFlowerInformation
);


// ============================================================
// CAMERA INPUT
// ============================================================

let cameraYaw =
    0;

let cameraPitch =
    -0.2;

let dragging =
    false;


window.addEventListener(

    "mousedown",

    () => {

        if (
            gameStarted &&
            !gamePaused
        ) {

            dragging =
                true;

        }

    }

);


window.addEventListener(

    "mouseup",

    () => {

        dragging =
            false;

    }

);


window.addEventListener(

    "mouseleave",

    () => {

        dragging =
            false;

    }

);


window.addEventListener(

    "mousemove",

    (event) => {

        if (
            !dragging ||
            !gameStarted ||
            gamePaused
        ) {

            return;

        }


        cameraYaw -=
            event.movementX *
            0.004;


        cameraPitch -=
            event.movementY *
            0.003;


        cameraPitch =
            THREE.MathUtils.clamp(
                cameraPitch,
                -0.6,
                0.35
            );

    }

);


// ============================================================
// MOVEMENT
// ============================================================

const direction =
    new THREE.Vector3();


const forward =
    new THREE.Vector3();


const right =
    new THREE.Vector3();


const up =
    new THREE.Vector3(
        0,
        1,
        0
    );


const WALK_SPEED =
    4;


const RUN_SPEED =
    7;


// ============================================================
// UPDATE PLAYER
// ============================================================

function updatePlayer(
    delta
) {

    if (
        !gameStarted ||
        gamePaused
    ) {

        updateWalkAnimation(
            false
        );

        return;

    }


    direction.set(
        0,
        0,
        0
    );


    camera.getWorldDirection(
        forward
    );


    forward.y =
        0;


    forward.normalize();


    right.crossVectors(
        forward,
        up
    );


    right.normalize();


    if (
        keys.forward
    ) {

        direction.add(
            forward
        );

    }


    if (
        keys.backward
    ) {

        direction.sub(
            forward
        );

    }


    if (
        keys.right
    ) {

        direction.add(
            right
        );

    }


    if (
        keys.left
    ) {

        direction.sub(
            right
        );

    }


    const moving =
        direction.lengthSq() >
        0;


    if (
        moving
    ) {

        direction.normalize();


        const speed =
            keys.run
                ? RUN_SPEED
                : WALK_SPEED;


        player.position.addScaledVector(
            direction,
            speed *
            delta
        );


        const angle =
            Math.atan2(
                direction.x,
                direction.z
            );


        const targetRotation =
            new THREE.Quaternion();


        targetRotation.setFromAxisAngle(
            up,
            angle
        );


        player.quaternion.slerp(
            targetRotation,
            Math.min(
                delta *
                10,
                1
            )
        );

    }


    player.position.y =
        0;


    updateWalkAnimation(
        moving
    );

}


// ============================================================
// WALK ANIMATION
// ============================================================

function updateWalkAnimation(
    moving
) {

    if (
        !walkAction
    ) {

        return;

    }


    if (
        moving &&
        !isWalking
    ) {

        walkAction
            .reset()
            .play();


        isWalking =
            true;

    }


    if (
        !moving &&
        isWalking
    ) {

        walkAction.stop();


        isWalking =
            false;

    }

}


// ============================================================
// CAMERA
// ============================================================

const cameraTarget =
    new THREE.Vector3();


const desiredCameraPosition =
    new THREE.Vector3();


const CAMERA_DISTANCE =
    6;


const CAMERA_HEIGHT =
    2.2;


function updateCamera(
    delta
) {

    cameraTarget.copy(
        player.position
    );


    cameraTarget.y +=
        0.8;


    const horizontal =
        CAMERA_DISTANCE *
        Math.cos(
            cameraPitch
        );


    const vertical =
        CAMERA_DISTANCE *
        Math.sin(
            cameraPitch
        );


    desiredCameraPosition.set(

        player.position.x +
        Math.sin(
            cameraYaw
        ) *
        horizontal,


        player.position.y +
        CAMERA_HEIGHT -
        vertical,


        player.position.z +
        Math.cos(
            cameraYaw
        ) *
        horizontal

    );


    camera.position.lerp(
        desiredCameraPosition,
        Math.min(
            delta *
            7,
            1
        )
    );


    camera.lookAt(
        cameraTarget
    );

}


// ============================================================
// UPDATE FLOWERS
// ============================================================

function updateFlowers() {

    if (
        !gameStarted ||
        gamePaused ||
        flowers.length ===
        0
    ) {

        return;

    }


    const time =
        performance.now() *
        0.002;


    for (
        const flower
        of flowers
    ) {

        if (
            !flower ||
            flower.userData.collected
        ) {

            continue;

        }


        flower.rotation.y +=
            0.012;


        flower.position.y =
            flower.userData.baseY +
            0.05 +
            Math.sin(
                time +
                flower.userData.animationOffset
            ) *
            0.05;


        const dx =
            player.position.x -
            flower.position.x;


        const dz =
            player.position.z -
            flower.position.z;


        const distance =
            Math.sqrt(
                dx * dx +
                dz * dz
            );


        if (
            distance <
            FLOWER_PICKUP_DISTANCE
        ) {

            collectFlower(
                flower
            );

            break;

        }

    }

}


// ============================================================
// COLLECT FLOWER
// ============================================================

function collectFlower(
    flower
) {

    if (
        !flower ||
        flower.userData.collected
    ) {

        return;

    }


    flower.userData.collected =
        true;


    flowerCount +=
        1;


    scene.remove(
        flower
    );


    updateFlowerUI();


    showFlowerInformation(
        flowerCount
    );

}


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(

    "resize",

    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );


        renderer.setPixelRatio(
            Math.min(
                window.devicePixelRatio,
                2
            )
        );

    }

);


// ============================================================
// CLOCK
// ============================================================

const clock =
    new THREE.Clock();


// ============================================================
// GAME LOOP
// ============================================================

function animate() {

    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    updatePlayer(
        delta
    );


    updateCamera(
        delta
    );


    updateFlowers();


    if (
        mixer &&
        !gamePaused
    ) {

        mixer.update(
            delta
        );

    }


    renderer.render(
        scene,
        camera
    );


    requestAnimationFrame(
        animate
    );

}


// ============================================================
// START
// ============================================================

updateFlowerUI();

animate();