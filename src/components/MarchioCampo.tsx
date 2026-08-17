"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { avviaCampo } from "@/lib/tela-campo";

/**
 * Il marchio: l'immagine originale, resa come oggetto.
 *
 * ── Due strade sbagliate, e perché ──
 *
 * Prima il PNG appoggiato sulla pagina: un oggetto reso altrove, lucido, con
 * la propria luce, sopra una schermata che di luci non ne aveva. Stonava.
 *
 * Poi la spirale **ridisegnata** dalla formula del campo: perfettamente
 * coerente col resto, e senza identità. I filamenti del logo somigliano a
 * fronti d'onda a spirale, ma «una spirale» non è **quella** spirale: le
 * lobature, il verso, il taglio del ciano in basso a destra sono il marchio, e
 * una figura generata non li ha. Coerenza pagata con il riconoscimento — un
 * pessimo cambio per un logo.
 *
 * ── La terza ──
 *
 * La figura resta l'immagine vera, pixel per pixel. Cambia cosa le sta
 * intorno: non è più incollata alla pagina, è **dentro una sfera di vetro**.
 *
 * Il volume non è dipinto, è calcolato. Per ogni pixel del cerchio si ricava
 * la normale della sfera corrispondente, e la trama si campiona **rifratta**:
 * il raggio devia entrando nel vetro, e la deviazione cresce verso l'orlo — al
 * centro l'immagine si ingrandisce, ai bordi si comprime. È ciò che fa una
 * biglia con un disegno dentro, e nessun gradiente lo imita: quella
 * compressione è la cosa che l'occhio legge come «curvo».
 *
 * Sopra ci vanno una luce diffusa, un riflesso speculare e un bordo di
 * Fresnel — di taglio il vetro riflette quasi tutto, ed è quell'orlo luminoso
 * che dice «sfera» prima di qualunque altra cosa.
 *
 * ── E il contesto ──
 *
 * La luce segue il puntatore a metà strada, la spirale gira piano, e tenendo
 * premuto il titolo il vetro si ispessisce e il marchio si gonfia — con gli
 * stessi due valori (carica e impulso) che muovono il campo dietro. È lì che
 * l'oggetto smette di essere estraneo: non perché sia fatto della stessa
 * materia, ma perché risponde alle stesse cose.
 *
 * ── Il ripiego ──
 *
 * Lo stesso PNG, in un `<img>`, finché la tela non ha davvero disegnato. È un
 * logo: l'unica cosa peggiore di un logo che non si amalgama è un logo che
 * manca. E siccome è lo stesso file, il browser lo scarica una volta sola —
 * quando la trama serve, è già in cache.
 */

const FRAMMENTO = `
uniform sampler2D logo;
uniform float carica;

/*
 * ── Il marchio vero, reso come oggetto ──
 *
 * I due tentativi precedenti ridisegnavano la spirale da zero con la formula
 * del campo. Coerente, e sbagliato: il logo perdeva la propria identita' —
 * quelle lobature, quella rotazione, quel taglio del ciano in basso a destra
 * non sono «una spirale qualunque», sono **quella**.
 *
 * Qui la figura e' l'immagine originale, pixel per pixel. Cambia solo cosa le
 * sta intorno: non e' piu' appiccicata alla pagina, e' dentro una sfera.
 *
 * ── Come nasce il volume ──
 *
 * Per ogni pixel dentro il cerchio si ricava la normale della sfera che
 * quel cerchio sarebbe: z = sqrt(1 - r*r). Da li' in poi e' geometria vera.
 *
 * La trama non si campiona dritta: si rifrange. Il raggio che entra nel vetro
 * devia, e la deviazione cresce verso il bordo — al centro l'immagine si
 * ingrandisce, ai bordi si comprime. E' esattamente quello che fa una biglia
 * di vetro con un disegno dentro, ed e' cio' che rende la curvatura *vera*
 * invece che dipinta: nessun gradiente puo' imitare quella compressione.
 *
 * ── Perche' i vuoti si riempiono di chiaro ──
 *
 * I filamenti chiari del logo sono **buchi** nel PNG, non pixel bianchi: su un
 * fondo chiaro si leggono bianchi, su questo fondo scuro diventerebbero neri e
 * il marchio si capovolgerebbe. Si riempiono di chiaro, che e' come il segno
 * si e' sempre letto.
 */
void main() {
  vec2 q = (gl_FragCoord.xy - 0.5 * risoluzione) / (0.5 * min(risoluzione.x, risoluzione.y));
  float r = length(q);

  // Il bordo si ammorbidisce su un pixel, non su una frazione fissa del raggio:
  // cosi' il contorno e' netto uguale a ottanta pixel e a trecento.
  float px = fwidth(r) * 1.5;
  float dentro = 1.0 - smoothstep(1.0 - px, 1.0, r);

  // La sfera. z e' l'altezza della calotta sopra il piano dello schermo.
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 n = normalize(vec3(q, max(z, 1e-4)));

  // La rifrazione attraverso il vetro. L'indice 1,45 e' quello del vetro
  // comune: non serve che sia esatto, serve che il rapporto fra centro e bordo
  // sia quello che l'occhio conosce.
  vec3 rd = vec3(0.0, 0.0, -1.0);
  float eta = 1.0 / 1.45;
  float cosi = -dot(n, rd);
  float k = 1.0 - eta * eta * (1.0 - cosi * cosi);
  vec3 rifratto = eta * rd + (eta * cosi - sqrt(max(k, 0.0))) * n;
  // Tenendo premuto il vetro si «ispessisce»: la deviazione cresce e il
  // marchio si gonfia verso di te.
  vec2 dev = q + rifratto.xy * (0.42 + carica * 0.20);

  // La spirale gira. Lentamente: e' un marchio, non una rotella di caricamento.
  float ang = tempo * 0.12;
  float ca = cos(ang), sa = sin(ang);
  vec2 uv = vec2(dev.x * ca - dev.y * sa, dev.x * sa + dev.y * ca);
  // L'impulso allarga di un soffio, come il campo dietro.
  uv *= 1.08 - impulso * 0.10;

  vec4 t = texture(logo, 0.5 + 0.5 * uv);

  // ── Niente disco bianco ──
  //
  // Prima la sfera era piena e i vuoti del marchio si riempivano di chiaro:
  // veniva fuori una biglia bianca con dentro la spirale, cioe' un oggetto in
  // piu' sulla schermata. La forma adesso e' la **sagoma del logo**: dove
  // l'immagine e' trasparente non si disegna niente e si vede la pagina.
  //
  // Il volume resta, perche' la normale della sfera e la rifrazione si
  // calcolano lo stesso: i nastri si incurvano come se stessero sopra una
  // calotta, ma la calotta non si vede. E' la differenza fra «la spirale sta
  // dentro una palla» e «la spirale e' tridimensionale».
  vec3 col = t.rgb;
  float materia = t.a * dentro;

  // Lo scarto dopo le derivate: fwidth() e texture() confrontano frammenti
  // vicini, e uscendo prima si toglierebbero di mezzo proprio i vicini di chi
  // sta sul contorno — l'unico posto in cui lo si guarda.
  if (materia <= 0.004) discard;

  // La luce segue il puntatore, a meta' strada: seguendolo esattamente la
  // sfera diventa un riflesso del mouse e smette di sembrare un oggetto.
  vec3 luce = normalize(vec3(-0.35 + puntatore.x * 0.5, 0.45 + puntatore.y * 0.5, 0.82));
  float diffusa = 0.62 + 0.38 * max(dot(n, luce), 0.0);
  float lucido = pow(max(reflect(-luce, n).z, 0.0), 34.0) * 0.55;
  // Fresnel: di taglio il vetro riflette quasi tutto, ed e' il bordo luminoso
  // che dice «sfera» prima di qualunque altra cosa.
  float bordo = pow(1.0 - z, 3.0);

  col *= diffusa;
  col += lucido;
  // Il bordo di Fresnel adesso corre lungo il **contorno dei nastri**, non
  // lungo un cerchio: e' quello che dice «questo pezzo e' curvo» senza
  // disegnare la sfera che lo contiene.
  col += bordo * 0.35 * CIANO;
  // Occlusione verso l'orlo della calotta: i nastri che stanno di taglio si
  // scuriscono, ed e' cio' che tiene insieme la lettura del volume.
  col *= 1.0 - 0.30 * smoothstep(0.72, 1.0, r);
  // Carica e impulso lo accendono, con gli stessi due valori del resto della
  // schermata: e' l'unico momento in cui il marchio e il campo si muovono
  // insieme, ed e' quello che li fa leggere come una cosa sola.
  col += (carica * 0.18 + impulso * 0.30) * VIOLA;

  colore = vec4(col, materia);
}`;

export function MarchioCampo({
  className = "",
  /**
   * Il lato del riquadro, in classi Tailwind.
   *
   * Un segno da cento pixel in cima a una colonna non aveva un ruolo: né
   * marchio in barra né oggetto della schermata — «un po' senza senso», ed era
   * una lettura giusta. Adesso occupa il vuoto a destra del titolo, e a quella
   * misura è la seconda cosa che si guarda dopo le parole.
   */
  classeDisco = "h-32 w-32 sm:h-40 sm:w-40 lg:h-72 lg:w-72",
}: {
  className?: string;
  classeDisco?: string;
}) {
  const scatola = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [vivo, setVivo] = useState(false);
  const segnalaVivo = useCallback(() => setVivo(true), []);

  useEffect(() => {
    const canvas = tela.current;
    if (!canvas) return;

    /**
     * La carica arriva dal titolo, che è il pezzo che si tiene premuto.
     *
     * Un secondo evento accanto a `vybes:impulso`, invece di una proprietà:
     * marchio e titolo sono fratelli in punti diversi dell'albero, e legarli
     * per proprietà obbligherebbe a far risalire lo stato fino all'hero e
     * ridiscendere — con un rendering di React per ogni fotogramma di
     * pressione, che è esattamente ciò che si sta evitando.
     */
    let carica = 0;
    let caricaOra = 0;
    const suCarica = (e: Event) => {
      carica = (e as CustomEvent<{ valore: number }>).detail?.valore ?? 0;
    };
    window.addEventListener("vybes:carica", suCarica);

    /**
     * Il PNG del marchio, caricato una volta e messo in una trama.
     *
     * È la stessa immagine del ripiego, quindi il browser la scarica una volta
     * sola: quando la tela è pronta, il file è già in cache. Il primo disegno
     * la aspetta — senza, la sfera comparirebbe vuota per un istante, e una
     * sfera vuota si nota molto più di un logo che arriva un decimo dopo.
     */
    const immagine = new window.Image();
    immagine.decoding = "async";
    immagine.src = "/logo-vybes.png";
    const pronta = immagine.decode().catch(() => {});
    let trama: WebGLTexture | null = null;
    let caricata = false;

    const stop = avviaCampo(canvas, {
      nome: "MarchioCampo",
      frammento: FRAMMENTO,
      uniformi: ["logo", "carica"],
      attendi: pronta,
      // Densità imposta, non massima: qui la densità dello schermo non
      // c'entra. La trama del marchio ha 426 pixel per lato e il disco ne
      // occupa 112; su uno schermo a 0,9 la tela nasceva a cento pixel veri e
      // le mipmap fondevano i filamenti chiari con le lobature scure — il
      // logo diventava una palla fangosa. Si disegna a 336 e si lascia
      // ridurre al browser: sovracampionamento, il modo classico di tenere
      // netto un dettaglio più fine del pixel. Su diecimila pixel costa nulla.
      densitaFissa: 3,
      suVivo: segnalaVivo,
      suProgramma: (gl, posti) => {
        trama = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, trama);
        // `CLAMP_TO_EDGE`: la trama viene campionata **rifratta**, quindi
        // vicino all'orlo si legge oltre il bordo dell'immagine. Ripetendola,
        // il marchio ricomparirebbe specchiato sull'altro lato della sfera.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        // Mipmap e filtro trilineare: il disco è disegnato a un terzo della
        // misura dell'immagine, e senza mipmap i filamenti sottili
        // sfarfallerebbero mentre la spirale gira.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.uniform1i(posti.logo, 0);
      },
      // Il caricamento avviene alla prima misura, che arriva dopo `attendi`:
      // è il primo istante in cui l'immagine esiste davvero.
      suMisura: ({ gl }) => {
        if (caricata || !immagine.naturalWidth) return;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, trama);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, immagine);
        gl.generateMipmap(gl.TEXTURE_2D);
        caricata = true;
      },
      // Insegue invece di saltare, con la stessa costante del titolo: i due si
      // gonfiano allo stesso ritmo, ed è quello che li fa leggere come un
      // pezzo solo invece che come due animazioni che partono insieme.
      suFotogramma: (gl, posti) => {
        caricaOra += (carica - caricaOra) * 0.12;
        gl.uniform1f(posti.carica, caricaOra);
      },
    });

    return () => {
      window.removeEventListener("vybes:carica", suCarica);
      stop();
    };
  }, [segnalaVivo]);

  return (
    <div ref={scatola} className={`relative ${classeDisco} ${className}`}>
      {!vivo && (
        <Image
          src="/logo-vybes.png"
          alt=""
          width={320}
          height={320}
          priority
          className="absolute inset-0 h-full w-full object-contain"
          sizes="112px"
          draggable={false}
        />
      )}
      <canvas
        ref={tela}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
