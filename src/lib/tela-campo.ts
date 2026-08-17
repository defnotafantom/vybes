import { ANCORA, CAMPO_GLSL } from "@/lib/campo";

/**
 * Il motore comune alle tre superfici del campo.
 *
 * ── Perché non tre volte ──
 *
 * Sfondo, titolo e marchio hanno bisogno delle stesse identiche cose: un
 * contesto WebGL2, un triangolo che copre lo schermo, le stesse nove uniform,
 * la stessa densità di pixel, gli stessi ascoltatori di scorrimento, puntatore
 * e impulso, la stessa sospensione fuori schermo e la stessa liberazione del
 * contesto all'uscita.
 *
 * Averle scritte tre volte significherebbe che una correzione — poniamo, un
 * ascoltatore che non viene rimosso — va fatta in tre posti, e che il giorno
 * in cui se ne dimentica uno il difetto esiste solo su una delle tre
 * superfici. È il caso peggiore: non si rompe, si scorda.
 *
 * Qui la meccanica sta in un posto, e ogni componente porta solo la propria
 * parte di GLSL e le proprie uniform.
 *
 * ── Cosa resta a chi chiama ──
 *
 * Il frammento, le uniform aggiuntive, e tre agganci: uno alla creazione, uno
 * dopo ogni cambio di misura, uno per fotogramma. Non un'astrazione generica —
 * è il minimo che serve a queste tre e nient'altro.
 */

const VERTICE = `#version 300 es
in vec2 posizione;
void main() { gl_Position = vec4(posizione, 0.0, 1.0); }`;

/** Densità massima: oltre 1,5 non si distingue e la GPU lavora il doppio. */
const DENSITA_MASSIMA = 1.5;

/** Le uniform che tutte e tre condividono. */
const COMUNI = [
  "risoluzione",
  "finestra",
  "origine",
  "tempo",
  "chiaro",
  "scorrimento",
  "puntatore",
  "impulso",
  "ancora",
] as const;

export type Posti = Record<string, WebGLUniformLocation | null>;

export type Misura = {
  gl: WebGL2RenderingContext;
  posti: Posti;
  larghezza: number;
  altezza: number;
  densita: number;
  /** Il riquadro della tela e quello dell'hero, in pixel CSS. */
  tela: DOMRect;
  campo: DOMRect;
};

export type Opzioni = {
  /** Il corpo del frammento: `CAMPO_GLSL` viene anteposto da qui. */
  frammento: string;
  /** Nomi delle uniform in più rispetto alle comuni. */
  uniformi?: readonly string[];
  /** Una volta, dopo il collegamento del programma. */
  suProgramma?: (gl: WebGL2RenderingContext, posti: Posti) => void;
  /** Dopo ogni cambio di misura, e al primo disegno. */
  suMisura?: (m: Misura) => void;
  /** A ogni fotogramma, prima del disegno. */
  suFotogramma?: (gl: WebGL2RenderingContext, posti: Posti) => void;
  /** Da aspettare prima del primo disegno — per esempio i font. */
  attendi?: Promise<unknown>;
  /** Chiamato quando il primo fotogramma è davvero uscito. */
  suVivo?: () => void;
  /** Per i messaggi di diagnostica in sviluppo. */
  nome: string;
};

function compila(
  gl: WebGL2RenderingContext,
  tipo: number,
  sorgente: string,
  nome: string
) {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, sorgente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    // In produzione si rinuncia in silenzio: un ornamento che manda in errore
    // la pagina che ornava è il difetto peggiore che possa produrre.
    //
    // In sviluppo no. Rinunciare in silenzio anche lì sarebbe la forma di
    // difetto numero uno di COLLOQUIO.md: un refuso nel GLSL darebbe una
    // pagina identica a prima, e la causa la si cercherebbe altrove per
    // mezz'ora. Il registro di compilazione dice riga e colonna.
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${nome}] shader non compilato:\n${gl.getShaderInfoLog(s) ?? "—"}`);
    }
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * Avvia una superficie del campo su una tela. Restituisce la funzione di
 * smontaggio; se WebGL non c'è o lo shader non compila, restituisce una
 * funzione vuota e non succede niente — che è il comportamento voluto.
 */
export function avviaCampo(canvas: HTMLCanvasElement, opzioni: Opzioni): () => void {
  const niente = () => {};

  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
  });
  if (!gl) return niente;

  const sorgente = `#version 300 es
precision highp float;
out vec4 colore;
${CAMPO_GLSL}
${opzioni.frammento}`;

  const vs = compila(gl, gl.VERTEX_SHADER, VERTICE, opzioni.nome);
  const fs = compila(gl, gl.FRAGMENT_SHADER, sorgente, opzioni.nome);
  if (!vs || !fs) return niente;

  const programma = gl.createProgram();
  if (!programma) return niente;
  gl.attachShader(programma, vs);
  gl.attachShader(programma, fs);
  gl.linkProgram(programma);
  if (!gl.getProgramParameter(programma, gl.LINK_STATUS)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[${opzioni.nome}] programma non collegato:\n${gl.getProgramInfoLog(programma)}`);
    }
    return niente;
  }
  gl.useProgram(programma);

  // Un triangolo più grande dello schermo, non due che formano un quadrato:
  // un vertice in meno e nessuna diagonale al centro, dove i frammenti dei due
  // triangoli verrebbero calcolati due volte.
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const attrib = gl.getAttribLocation(programma, "posizione");
  gl.enableVertexAttribArray(attrib);
  gl.vertexAttribPointer(attrib, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const posti: Posti = {};
  for (const nome of [...COMUNI, ...(opzioni.uniformi ?? [])]) {
    posti[nome] = gl.getUniformLocation(programma, nome);
  }
  opzioni.suProgramma?.(gl, posti);

  let larghezza = 0;
  let altezza = 0;
  let densita = 1;

  let impulso = 0;
  let scorrimentoVerso = 0;
  let scorrimentoOra = 0;
  const puntatoreVerso = { x: 0, y: 0 };
  const puntatoreOra = { x: 0, y: 0 };

  /** L'hero: il riquadro in cui il campo è definito. */
  function riquadroCampo(): DOMRect {
    const rif = canvas.closest("[data-campo]") as HTMLElement | null;
    return (rif ?? canvas).getBoundingClientRect();
  }

  function ridimensiona(): boolean {
    // Metà risoluzione sotto i 640px: su un telefono la differenza non si vede
    // e il consumo si dimezza. Il pubblico è fatto di artisti col telefono.
    densita = Math.min(
      DENSITA_MASSIMA,
      window.devicePixelRatio || 1,
      window.innerWidth < 640 ? 1 : DENSITA_MASSIMA
    );
    const w = Math.floor(canvas.clientWidth * densita);
    const h = Math.floor(canvas.clientHeight * densita);
    if (w === larghezza && h === altezza) return false;
    larghezza = w;
    altezza = h;
    canvas.width = w;
    canvas.height = h;
    gl!.viewport(0, 0, w, h);
    return true;
  }

  /**
   * Dove sta questa tela dentro l'hero.
   *
   * L'asse verticale di WebGL parte dal basso: l'origine è la distanza fra il
   * fondo dell'hero e il fondo della tela, non fra i due alti. Sbagliarlo non
   * dà un errore — dà un campo che sembra giusto e non combacia con quello
   * delle altre superfici, che è precisamente ciò che si sta evitando.
   */
  function geometria() {
    const campo = riquadroCampo();
    const tela = canvas.getBoundingClientRect();
    scorrimentoVerso = Math.min(1, Math.max(0, -campo.top / Math.max(1, campo.height)));
    gl!.uniform2f(posti.finestra, campo.width * densita, campo.height * densita);
    gl!.uniform2f(
      posti.origine,
      (tela.left - campo.left) * densita,
      (campo.bottom - tela.bottom) * densita
    );
    return { campo, tela };
  }

  function suPuntatore(e: PointerEvent) {
    const r = riquadroCampo();
    const lato = Math.min(r.width, r.height);
    puntatoreVerso.x = (e.clientX - r.left - r.width / 2) / lato;
    // L'asse verticale è rovesciato: senza il segno il campo insegue il
    // cursore specchiato, e si nota subito.
    puntatoreVerso.y = -((e.clientY - r.top - r.height / 2) / lato);
  }

  const menoMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function misura() {
    const { campo, tela } = geometria();
    opzioni.suMisura?.({ gl: gl!, posti, larghezza, altezza, densita, tela, campo });
  }

  function disegna(secondi: number) {
    if (ridimensiona()) misura();
    gl!.uniform2f(posti.risoluzione, larghezza, altezza);
    gl!.uniform1f(posti.tempo, secondi);
    gl!.uniform1f(posti.chiaro, document.documentElement.classList.contains("dark") ? 0 : 1);

    // L'inseguimento: un quinto della distanza per fotogramma. Senza, il campo
    // seguirebbe il cursore a strappi e ogni frenata sarebbe uno scossone. Con
    // l'inseguimento sembra che abbia una massa — che è quello che gli dà
    // l'aria di essere una cosa e non un valore.
    scorrimentoOra += (scorrimentoVerso - scorrimentoOra) * 0.2;
    puntatoreOra.x += (puntatoreVerso.x - puntatoreOra.x) * 0.2;
    puntatoreOra.y += (puntatoreVerso.y - puntatoreOra.y) * 0.2;
    gl!.uniform1f(posti.scorrimento, scorrimentoOra);
    gl!.uniform2f(posti.puntatore, puntatoreOra.x, puntatoreOra.y);
    gl!.uniform2f(posti.ancora, ANCORA.x, ANCORA.y);
    // Decade da solo a ogni fotogramma: nessun timer da annullare, e una
    // scheda lasciata aperta non accumula niente.
    impulso *= 0.94;
    gl!.uniform1f(posti.impulso, impulso);

    opzioni.suFotogramma?.(gl!, posti);

    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLES, 0, 3);
  }

  let richiesta = 0;
  let visibile = true;
  let smontato = false;
  let partito = false;
  const inizio = performance.now();

  function ciclo(ora: number) {
    disegna((ora - inizio) / 1000);
    richiesta = requestAnimationFrame(ciclo);
  }
  function avvia() {
    if (menoMovimento || richiesta || !partito) return;
    richiesta = requestAnimationFrame(ciclo);
  }
  function ferma() {
    if (!richiesta) return;
    cancelAnimationFrame(richiesta);
    richiesta = 0;
  }

  function primoDisegno() {
    if (smontato) return;
    partito = true;
    ridimensiona();
    misura();
    // Un fotogramma c'è sempre: con `prefers-reduced-motion` è l'opera finita,
    // altrimenti è ciò che si vede nell'istante prima che il ciclo parta.
    disegna(6.5);
    opzioni.suVivo?.();
    if (!menoMovimento && visibile && !document.hidden) avvia();
  }

  if (opzioni.attendi) opzioni.attendi.then(primoDisegno).catch(primoDisegno);
  else primoDisegno();

  /* Il campo deve rispondere anche a chi scorre **senza** che il ciclo sia
   * partito — con `prefers-reduced-motion` non parte affatto. In quel caso si
   * ridisegna un fotogramma per gesto: nessuna animazione continua, ma la
   * pagina non resta sorda a quello che si fa. */
  function suGesto() {
    if (!partito) return;
    geometria();
    if (menoMovimento) disegna(6.5);
  }

  // `pointermove` copre mouse, penna e dito con un ascoltatore solo.
  // `passive`: non si chiama mai `preventDefault`, e dirlo permette al browser
  // di non aspettare prima di far scorrere la pagina.
  window.addEventListener("scroll", suGesto, { passive: true });
  window.addEventListener("resize", suGesto, { passive: true });
  window.addEventListener("pointermove", suPuntatore, { passive: true });

  const suImpulso = (e: Event) => {
    const forza = (e as CustomEvent<{ forza: number }>).detail?.forza ?? 1;
    impulso = Math.min(1, impulso + forza);
    if (menoMovimento && partito) disegna(6.5);
  };
  window.addEventListener("vybes:impulso", suImpulso);

  // Il testo e le posizioni vanno rilette quando cambia l'ingombro: rotazione
  // del telefono, font arrivato in ritardo, o una riga che va a capo
  // diversamente perché la finestra si è stretta.
  const osservaMisura = new ResizeObserver(() => {
    if (!partito) return;
    if (!ridimensiona()) misura();
    if (menoMovimento) disegna(6.5);
  });
  osservaMisura.observe(canvas);

  // Fuori schermo o scheda in secondo piano: si sospende. Una GPU che macina
  // per una pagina che nessuno guarda è batteria rubata.
  const osservatore = new IntersectionObserver(
    ([voce]) => {
      visibile = voce.isIntersecting;
      visibile && !document.hidden ? avvia() : ferma();
    },
    { threshold: 0 }
  );
  osservatore.observe(canvas);

  const suVisibilita = () => (document.hidden || !visibile ? ferma() : avvia());
  document.addEventListener("visibilitychange", suVisibilita);

  return () => {
    smontato = true;
    ferma();
    osservaMisura.disconnect();
    osservatore.disconnect();
    document.removeEventListener("visibilitychange", suVisibilita);
    window.removeEventListener("scroll", suGesto);
    window.removeEventListener("resize", suGesto);
    window.removeEventListener("pointermove", suPuntatore);
    window.removeEventListener("vybes:impulso", suImpulso);
    // Il contesto si libera a mano: lasciarlo al raccoglitore significa tenere
    // occupata la GPU finché non gli va, e i contesti WebGL per scheda sono un
    // numero piccolo e finito.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
