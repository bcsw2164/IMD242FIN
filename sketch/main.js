// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.
let video;
let faceMesh;
let faces = [];

let mouthDistance = 0; // 입의 거리 저장용 변수
let prevMouthState = 'Closed'; // 이전 상태 저장
let lastCreationTime = 0; // 마지막 그룹 생성 시간
const minInterval = 500; // 그룹 생성 간 최소 시간 간격 (밀리초)

// Matter.js 엔진 및 월드 설정
const { Engine, Composite, Bodies, Constraint, Body } = Matter;
let engine;
let world;
let chain = [];
let customFont;

// 그룹 정의
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

function mousePressed() {
  console.log(faces);
}

function gotFaces(results) {
  faces = results;
}

function setup() {
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();

  if (aspectW === 0 || aspectH === 0) {
    createCanvas(containerW, containerH).parent(container);
  } else if (containerW / containerH > aspectW / aspectH) {
    createCanvas((containerH * aspectW) / aspectH, containerH).parent();
  } else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }

  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  // Matter.js 엔진 초기화
  engine = Engine.create();
  world = engine.world;

  createBounds(width, height); // 벽 생성
  init();
}

function init() {
  // Matter.js 물리 엔진 중력 설정 (위로 작용하도록 y 값을 음수로 설정)
  engine.world.gravity.y = -1; // 중력을 위로 설정
}

function draw() {
  background(220);
  image(video, 0, 0, width, height);

  if (faces.length > 0) {
    for (let face of faces) {
      const topLip = face.keypoints[13];
      const bottomLip = face.keypoints[14];

      const topLipX = map(topLip.x, 0, video.width, 0, width);
      const topLipY = map(topLip.y, 0, video.height, 0, height);
      const bottomLipX = map(bottomLip.x, 0, video.width, 0, width);
      const bottomLipY = map(bottomLip.y, 0, video.height, 0, height);

      mouthDistance = dist(topLipX, topLipY, bottomLipX, bottomLipY);
      mouthDistance = int(mouthDistance);

      let mouthState = '';
      if (mouthDistance >= 1 && mouthDistance <= 15) {
        mouthState = 'Closed';
      } else if (mouthDistance > 15) {
        mouthState = 'Opened';
      }

      const currentTime = millis();
      if (
        mouthState === 'Opened' &&
        prevMouthState === 'Closed' &&
        currentTime - lastCreationTime > minInterval
      ) {
        const selectedGroup = random(wordGroups);
        createWords(topLipX, topLipY, selectedGroup);
        lastCreationTime = currentTime;
      }

      prevMouthState = mouthState;
    }
  }

  Engine.update(engine);
  renderChain();
}

async function createWords(x, y, selectedGroup) {
  // 체인의 랜덤 크기 결정
  const baseSize = random(30, 70); // 그룹 내의 기본 크기
  const gap = 50; // 개체 간 간격
  let lastBody = null;

  // 선택된 그룹의 단어들을 순서대로 생성
  for (let i = 0; i < selectedGroup.words.length; i++) {
    const textValue = selectedGroup.words[i];
    const textSizeValue = baseSize + random(-5, 5); // 체인 내에서 크기 편차 제한
    const circleSize = textSizeValue * 1.5; // 원 크기는 텍스트 크기의 1.5배

    // 처음 생성은 입 중앙 기준
    const offsetX = (i - (selectedGroup.words.length - 1) / 2) * gap; // 그룹 가운데 정렬
    const circleBody = Bodies.circle(x, y, circleSize / 2, {
      render: { fillStyle: selectedGroup.shapeColor }, // 그룹 색상 적용
      friction: 1.0, // 높은 마찰로 안정성 증가
      restitution: 0.0, // 반발력 제거
      frictionAir: 0.3, // 공기 저항 증가
    });

    circleBody.label = textValue; // 텍스트 레이블 설정
    circleBody.size = textSizeValue; // 텍스트 크기 저장
    circleBody.textColor = selectedGroup.textColor; // 텍스트 색상 저장

    // 초기 밀림 효과 적용
    Body.applyForce(
      circleBody,
      { x: circleBody.position.x, y: circleBody.position.y },
      { x: offsetX * 0.001, y: 0 }
    );

    Composite.add(world, circleBody);

    if (lastBody) {
      const link = Constraint.create({
        bodyA: lastBody,
        bodyB: circleBody,
        length: circleSize * 0.8, // 텍스트 크기에 따라 연결 거리 설정
        stiffness: 0.9, // 강한 연결로 안정성 증가
        damping: 0.9, // 진동 감소
      });
      Composite.add(world, link);
      chain.push(link);
    }

    lastBody = circleBody;

    // 개체 생성 사이에 딜레이 추가로 생동감 부여
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function renderChain() {
  for (let i = 0; i < chain.length; i++) {
    const link = chain[i];

    const posA = link.bodyA.position;
    const posB = link.bodyB.position;

    stroke(0);
    strokeWeight(2);
    line(posA.x, posA.y, posB.x, posB.y);
  }

  const bodies = Composite.allBodies(world);
  for (let body of bodies) {
    if (body.circleRadius) {
      const { x, y } = body.position;
      fill(body.render.fillStyle || '#FFFFFF'); // 원 색상
      noStroke();
      ellipse(x, y, body.circleRadius * 2); // 텍스트 뒤의 원

      fill(body.textColor || '#000000'); // 텍스트 색상
      textAlign(CENTER, CENTER);
      textSize(body.size || 24); // 랜덤 크기의 텍스트
      textFont(customFont);
      textStyle(BOLD);
      text(body.label || '', x, y - body.size * 0.2); // 텍스트 출력
    }
  }
}

function createBounds(width, height) {
  // 양옆에 벽을 추가하고 천장과 바닥은 뚫음
  const thickness = 50;
  const bounds = [
    Bodies.rectangle(-thickness / 2, height / 2, thickness, height, {
      isStatic: true,
    }), // 왼쪽 벽
    Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, {
      isStatic: true,
    }), // 오른쪽 벽
  ];

  Composite.add(world, bounds);
}

function windowResized() {
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();

  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
  } else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  } else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
}
