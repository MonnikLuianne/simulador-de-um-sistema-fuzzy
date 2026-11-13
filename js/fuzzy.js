// ============================================================
// fuzzy.js — Núcleo do sistema fuzzy Mamdani de irrigação
// Usado pelo simulador (index.html) e pela página de testes (testes.html).
// Não depende da interface nem dos gráficos.
// ============================================================
function membership(x,a,b,c,d){
  if(x<a||x>d) return 0;
  if(b<=x&&x<=c) return 1;
  if(x<b) return (a===b)?1:(x-a)/(b-a);
  return (c===d)?1:(d-x)/(d-c);
}

const SETS={
  umidade:{
    seco:[0,0,20,50], intermediario:[20,50,50,80], umido:[50,80,100,100]
  },
  temperatura:{
    baixa:[10,10,15,25], media:[15,25,25,35], alta:[25,35,40,40]
  },
  saida:{
    curto:[0,0,0,15], medio:[0,15,15,30], longo:[15,30,30,30]
  }
};

const DEFAULT_RULES=[
  ['seco','baixa','medio'],['seco','media','longo'],['seco','alta','longo'],
  ['intermediario','baixa','curto'],['intermediario','media','medio'],['intermediario','alta','longo'],
  ['umido','baixa','curto'],['umido','media','curto'],['umido','alta','curto'],
];

function fuzzify(U,T){
  return{
    umidade:{
      seco:membership(U,...SETS.umidade.seco),
      intermediario:membership(U,...SETS.umidade.intermediario),
      umido:membership(U,...SETS.umidade.umido)
    },
    temperatura:{
      baixa:membership(T,...SETS.temperatura.baixa),
      media:membership(T,...SETS.temperatura.media),
      alta:membership(T,...SETS.temperatura.alta)
    }
  };
}

function evaluateRules(fi,rules){
  return rules.map(([uSet,tSet,outSet])=>{
    const muU=fi.umidade[uSet], muT=fi.temperatura[tSet], h=Math.min(muU,muT);
    return{uSet,tSet,outSet,muU,muT,h};
  });
}

function inferAndDefuzz(activations,dz){
  const N=Math.round(30/dz);
  let sumN=0,sumD=0;
  const pts=[];
  for(let k=0;k<N;k++){
    const z=(k+0.5)*dz;
    let muAgg=0;
    for(const{outSet,h} of activations){
      if(h===0) continue;
      muAgg=Math.max(muAgg,Math.min(h,membership(z,...SETS.saida[outSet])));
    }
    pts.push({z,mu:muAgg});
    sumN+=z*muAgg; sumD+=muAgg;
  }
  if(sumD===0) return{zStar:null,aggregatedPoints:pts};
  return{zStar:sumN/sumD,aggregatedPoints:pts};
}

// μ agregada calculada exatamente em um ponto z (usada no log de conferência)
function aggregatedAt(z,activations){
  let mu=0;
  for(const{outSet,h} of activations){
    if(h===0) continue;
    mu=Math.max(mu,Math.min(h,membership(z,...SETS.saida[outSet])));
  }
  return mu;
}

function runInference(U,T,rules,dz){
  const fuzzyInputs=fuzzify(U,T);
  const activations=evaluateRules(fuzzyInputs,rules);
  const{zStar,aggregatedPoints}=inferAndDefuzz(activations,dz);
  return{fuzzyInputs,activations,aggregatedPoints,zStar};
}

function sampleSet(params,domain,steps){
  steps=steps||400;
  const[mn,mx]=domain,res=[];
  for(let i=0;i<=steps;i++){
    const x=mn+(i/steps)*(mx-mn);
    res.push({x,y:membership(x,...params)});
  }
  return res;
}
