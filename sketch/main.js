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

function preload() {
  faceMesh = ml5.faceMesh({ flipped: true });
}

function mousePressed() {
  console.log(faces);
}

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
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }

  video = createCapture(VIDEO, { flipped: true });
  video.hide();

  faceMesh.detectStart(video, gotFaces);

  init();
  // createCanvas를 제외한 나머지 구문을 여기 혹은 init()에 작성.
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  background(220);
  image(video, 0, 0, width, height);

  if (faces.length > 0) {
    for (let face of faces) {
      for (let i = 0; i < face.keypoints.length; i++) {
        let keypoint = face.keypoints[i];

        // 13번과 14번 얼굴 키포인트만 그리기
        if (i === 13 || i === 14) {
          let x = map(keypoint.x, 0, video.width, 0, width);
          let y = map(keypoint.y, 0, video.height, 0, height);

          // 입술 좌표에 빨간색, 나머지 키포인트는 노란색
          if (i === 13 || i === 14) {
            fill(255, 0, 0); // 빨간색
          }

          noStroke();
          circle(x, y, 10); // 13번과 14번만 원으로 표시
        }
      }

      // 입술의 위쪽과 아래쪽 지점
      const topLip = face.keypoints[13];
      const bottomLip = face.keypoints[14];

      // 입술 좌표를 캔버스 좌표로 변환
      const topLipX = map(topLip.x, 0, video.width, 0, width);
      const topLipY = map(topLip.y, 0, video.height, 0, height);
      const bottomLipX = map(bottomLip.x, 0, video.width, 0, width);
      const bottomLipY = map(bottomLip.y, 0, video.height, 0, height);

      // 입술 두 지점 사이의 거리 계산
      mouthDistance = dist(topLipX, topLipY, bottomLipX, bottomLipY);

      // 입의 거리 값 소수점 없이 정수로 변경
      mouthDistance = int(mouthDistance); // 정수로 변환

      // "closed" 또는 "opened" 상태 결정
      let mouthState = '';
      if (mouthDistance >= 1 && mouthDistance <= 10) {
        mouthState = 'Closed';
      } else if (mouthDistance > 10) {
        mouthState = 'Opened';
      }

      // 화면에 입술 거리 및 상태 표시
      fill(0);
      textSize(24);
      textAlign(CENTER, CENTER);
      text(
        'Mouth Distance: ' + mouthDistance + ' (' + mouthState + ')',
        width / 2,
        height - 20
      );
    }
  }
}

function windowResized() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스 크기를 조정.
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
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
}
