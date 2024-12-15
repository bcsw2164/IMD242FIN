// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느하나라도 0으로 설정.
const aspectW = 0;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.

let video;
let faceMesh;
let faces = [];
let canvasW, canvasH;

let mouthDistance = 0; // 입 열고 닫을 때 거리 계산
let prevMouthState = 'Closed'; // 이전 상태 저장
let lastCreationTime = 0; // 마지막 그룹 생성 시간
const minInterval = 500; // 텍스트 생성할 때 최소 시간 간격

// Matter.js
const { Engine, Composite, Bodies, Constraint, Body } = Matter;
let engine;
let world;
let chain = [];
let customFont;

// 생성될 단어 그룹
const wordGroups = [
  {
    words: ['아', '진', '짜', '요'],
    textColor: '#404040',
    shapeColor: '#D9D9D9',
  },
  { words: ['배', '고', '파'], textColor: '#335095', shapeColor: '#6D8DD8' },
  { words: ['졸', '려'], textColor: '#8E1618', shapeColor: '#FA6F71' },
  {
    words: ['아', '니', '근', '데'],
    textColor: '#A87613',
    shapeColor: '#F9DA61',
  },
  {
    words: ['아', '개', '웃', '겨'],
    textColor: '#2F4937',
    shapeColor: '#55A16C',
  },
  {
    words: ['집', '가', '고', '싶', '다'],
    textColor: '#7D2FA7',
    shapeColor: '#AB5CD6',
  },
];

function preload() {
  customFont = loadFont('LINESeedKR-Bd.ttf');
  faceMesh = ml5.faceMesh({ flipped: true });
}

//function mousePressed() {
//console.log(faces);
//}

function gotFaces(results) {
  faces = results;
}

function setup() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  if (aspectW === 0 || aspectH === 0) {
    createCanvas(containerW, containerH).parent(container);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else if (containerW / containerH > aspectW / aspectH) {
    createCanvas((containerH * aspectW) / aspectH, containerH).parent();
  } // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }

  //video = createCapture(VIDEO, { flipped: true });
  video = createCapture(VIDEO, { flipped: true }, () => {
    video.size(width, height); // 비디오 크기를 캔버스에 맞춤
  });
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  // Matter.js 엔진 초기화
  engine = Engine.create();
  world = engine.world;

  createBounds(width, height); // 벽 생성
  init();
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠
function init() {
  engine.world.gravity.y = -1;
}

function draw() {
  background(220);
  image(video, 0, 0, width, height);

  if (faces.length > 0) {
    for (let face of faces) {
      // z축 값 부여하기 위해 얼굴과 눈의 위치를 계산. dist
      // 다크써클을 얼굴에 정확하게 위치하고 크기를 비율에 맞게 조정하기 위함 ↓↓↓↓
      const leftEyeOuter = face.keypoints[33]; // 왼쪽 눈 가장자리
      const rightEyeOuter = face.keypoints[263]; // 오른쪽 눈 가장자리
      const faceWidth = dist(
        map(leftEyeOuter.x, 0, video.width, 0, width),
        map(leftEyeOuter.y, 0, video.height, 0, height),
        map(rightEyeOuter.x, 0, video.width, 0, width),
        map(rightEyeOuter.y, 0, video.height, 0, height)
      ); // 얼굴 폭 계산, 비율

      const leftEye = face.keypoints[159];
      const rightEye = face.keypoints[386];

      const leftEyeX = map(leftEye.x, 0, video.width, 0, width);
      const leftEyeY = map(leftEye.y, 0, video.height, 0, height);
      const rightEyeX = map(rightEye.x, 0, video.width, 0, width);
      const rightEyeY = map(rightEye.y, 0, video.height, 0, height);
      // 좌표를 일치시키기(비디오 좌표를 캔버스 좌표로)

      // 다크써클 형태
      drawDarkCircle(
        leftEyeX,
        leftEyeY + faceWidth * 0.13,
        faceWidth * 0.5,
        faceWidth * 0.6,
        20
      );
      drawDarkCircle(
        rightEyeX,
        rightEyeY + faceWidth * 0.13,
        faceWidth * 0.5,
        faceWidth * 0.6,
        20
      );

      // 입 열고 닫는 거리를 계산하고 열림과 닫힘 정도를 미리 설정해둠
      const topLip = face.keypoints[13];
      const bottomLip = face.keypoints[14];

      const topLipX = map(topLip.x, 0, video.width, 0, width);
      const topLipY = map(topLip.y, 0, video.height, 0, height);
      const bottomLipX = map(bottomLip.x, 0, video.width, 0, width);
      const bottomLipY = map(bottomLip.y, 0, video.height, 0, height);

      mouthDistance = dist(topLipX, topLipY, bottomLipX, bottomLipY);
      mouthDistance = int(mouthDistance); //정수로 변환, 화면 하단에 텍스트로 띄울려고 보기 쉽게(나중에 삭제예정)

      let mouthState = '';
      if (mouthDistance >= 1 && mouthDistance <= 15) {
        mouthState = 'Closed';
      } else if (mouthDistance > 15) {
        mouthState = 'Opened';
      }

      // opended 상태일때 단어 그룹을 생성함
      // 1. 먼저 입이 열린 상태로 바뀌고 일정 시간이 지나면 실행
      // 2. 입이 열린 순간에 입 중앙을 기준으로 단어 생성됨
      const currentTime = millis();
      if (
        mouthState === 'Opened' &&
        prevMouthState === 'Closed' &&
        currentTime - lastCreationTime > minInterval
      ) {
        const selectedGroup = random(wordGroups);
        createWords(
          (topLipX + bottomLipX) / 2,
          (topLipY + bottomLipY) / 2,
          selectedGroup
        );
        // 3. 연속적으로 그룹이 생성되지 않게
        lastCreationTime = currentTime;
      }
      // 현재 입상태 (mouthState)를 (prevMouthState)로 업데이트, 다음 행동에서 입이 열렸는지 닫혔는지를 판단하기 위해
      prevMouthState = mouthState;
    }
  }

  Engine.update(engine);
  renderChain();
}

// 다크써클 드로잉, 레이어를 사용해서 그라데이션 효과를 줌
function drawDarkCircle(x, y, width, height, layers) {
  noStroke();
  for (let i = 0; i < layers; i++) {
    const alpha = map(i, 0, layers, 5, 5);
    fill(0, 0, 0, alpha);
    const layerHeight = map(i, 0, layers, 0, height);
    arc(x, y, width, layerHeight, 0, PI);
  }
}

// 그룹 내의 각 글자들을 주어진 위치를 기준으로 물리적으로 배치하고 체인으로 연결함
// **async 를 사용하면 await 를 사용할 수 있음 setTimeout을 이용한 지연을 처리할 수 있게됨 (솔직히 아직 이해는안가는..)
async function createWords(x, y, selectedGroup) {
  const baseSize = random(30, 70); // 크기는 여기서 조절
  const gap = 50; // 간격 조절
  let lastBody = null;

  for (let i = 0; i < selectedGroup.words.length; i++) {
    const textValue = selectedGroup.words[i];
    const textSizeValue = baseSize + random(-5, 5);
    const circleSize = textSizeValue * 1.5;

    const offsetX = (i - (selectedGroup.words.length - 1) / 2) * gap;
    const circleBody = Bodies.circle(x, y, circleSize / 2, {
      render: { fillStyle: selectedGroup.shapeColor },
      friction: 1.0,
      restitution: 0.0,
      frictionAir: 0.3,
    });

    circleBody.label = textValue;
    circleBody.size = textSizeValue;
    circleBody.textColor = selectedGroup.textColor;

    // 생성됐을 때 약간의 힘을 주어 단어들이 밀려나는 효과
    Body.applyForce(
      circleBody,
      { x: circleBody.position.x, y: circleBody.position.y },
      { x: offsetX * 0.001, y: 0 }
    );

    Composite.add(world, circleBody);

    // 각 글자를 체인으로 연결함
    if (lastBody) {
      const link = Constraint.create({
        bodyA: lastBody,
        bodyB: circleBody,
        length: circleSize * 0.8, // 연결 길이
        stiffness: 0.9, // 강성도
        damping: 0.9, // 진동 완화 정도
      });
      Composite.add(world, link);
      chain.push(link);
    }

    lastBody = circleBody;

    // 각 글자를 생성한 뒤 50ms 만큼 기다림, 글자가 한번에 3-4개씩 생성되는게 아니라 순차적으로 생성되게함
    // await를 사용해서 작업이 완료될때까지 기다릴 수 있게 됨 ** 이걸 사용하려면 async를 사용해야함**
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

// 체인 시각화
// 나중에 보고 각주처리하던가 아님 두께 0으로 설정하던가
function renderChain() {
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];

    const posA = link.bodyA.position;
    const posB = link.bodyB.position;

    stroke(0);
    strokeWeight(0);
    line(posA.x, posA.y, posB.x, posB.y);
  }

  const bodies = Composite.allBodies(world);
  //world 안에 존재하는 모든 body 객체 배열 반환
  for (let body of bodies) {
    if (body.circleRadius) {
      const { x, y } = body.position;
      fill(body.render.fillStyle || '#FFFFFF');
      noStroke();
      ellipse(x, y, body.circleRadius * 2); // 배경 원 설정

      fill(body.textColor || '#000000');
      textAlign(CENTER, CENTER);
      textSize(body.size || 24);
      textFont(customFont);
      textStyle(BOLD);
      text(body.label || '', x, y - body.size * 0.2); // 텍스트 설정
    }
  }
}

// 양 옆에 벽을 설정해서 생성된 단어들이 옆으로 빠져 이동하지 않게 막음
function createBounds(width, height) {
  const thickness = 50;
  const bounds = [
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, {
      isStatic: true,
    }),
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, {
      isStatic: true,
    }),
  ];

  Composite.add(world, bounds);
}

function windowResized() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스 크기를 조정.
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
    //if (video) video.size(containerW, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
  // 위 과정을 통해 캔버스 크기가 조정된 경우, 다시 처음부터 그려야할 수도 있다.
  // 이런 경우 setup()의 일부 구문을 init()에 작성해서 여기서 실행하는게 편리하다.
  // init();
}
