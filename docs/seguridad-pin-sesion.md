# Seguridad: PIN de usuario y sesion

## Que es HMAC

HMAC = **H**ash-based **M**essage **A**uthentication **C**ode.

Es un hash (SHA-256) pero con una **clave secreta** mezclada.

### Hash normal vs HMAC

```
SHA-256("1234") → "03ac674216..."         ← siempre igual, cualquiera puede calcularlo

HMAC-SHA256("1234", "mi-clave") → "a7f3b2c1..."
HMAC-SHA256("1234", "otra-clave") → "9e2d5f08..."   ← resultado totalmente diferente
```

Sin conocer la clave, no puedes reproducir el hash. Por eso un PIN de 4 digitos
(solo 10,000 combinaciones) se vuelve seguro: no puedes probar las combinaciones
offline porque no tienes la clave.

---

## Como funciona el PIN del usuario

### Registro (onboarding)

```
Usuario escribe PIN "1234"
        |
        v
hashCustomerPin("1234")          <-- Server Action (Node.js)
        |
        v
HMAC-SHA256("customer-pin:1234", ADMIN_HMAC_KEY)
        |
        v
Resultado: "a7f3b2c1..."        <-- hash de 64 caracteres hex
        |
        v
Se guarda en Firestore: customer.pinHmac = "a7f3b2c1..."
```

El PIN "1234" **nunca se almacena**. Solo se guarda el HMAC.

### Recuperacion (/recover)

```
Usuario escribe telefono + PIN "1234"
        |
        v
verifyCustomerPin("7712345678", "1234")    <-- Server Action
        |
        |-- 1. Consulta Firestore REST API por telefono
        |      -> Encuentra customer con pinHmac = "a7f3b2c1..."
        |
        |-- 2. Computa HMAC del PIN ingresado
        |      HMAC-SHA256("customer-pin:1234", ADMIN_HMAC_KEY) = "a7f3b2c1..."
        |
        |-- 3. Compara con timingSafeEqual (previene timing attacks)
        |      "a7f3b2c1..." === "a7f3b2c1..." -> Match
        |
        |-- 4. Busca tarjeta del cliente (active o completed)
        |
        +-- 5. Establece cookie httpOnly firmada + devuelve cardId
```

### Por que es seguro

- Sin la `ADMIN_HMAC_KEY` del servidor, el hash es inutil
- Alguien podria leer `pinHmac` de Firestore (es publico), pero no puede verificar
  ningun PIN sin la clave
- La clave vive solo en el servidor (variable de entorno, sin prefijo `NEXT_PUBLIC_`)
- `timingSafeEqual` evita que alguien mida el tiempo de respuesta para adivinar caracteres

---

## Cookie de sesion firmada

Cuando el login es exitoso, se crea una cookie httpOnly:

```
Valor:  "customerId:cardId:firma"
Firma:  HMAC-SHA256("session:customerId:cardId", ADMIN_HMAC_KEY)
```

Propiedades:
- **httpOnly** -> JavaScript no puede leerla (protege contra XSS)
- **Firmada** -> si alguien cambia el customerId o cardId, la firma no coincide
- **Duracion 1 anio** -> sobrevive a limpieza de localStorage
- **Fallback** -> primero se checa localStorage (mas rapido), si no existe se consulta la cookie

### Relacion con JWT

Es el mismo principio que JWT. La diferencia es solo el formato:

```
JWT:       header.payload.firma         (JSON en base64, estandar definido)
Cookie:    customerId:cardId:firma      (string simple)
```

En ambos casos la firma se calcula igual:
```
JWT:     HMAC-SHA256("header.payload", secret)
Cookie:  HMAC-SHA256("session:cusId:cardId", secret)
```

El proposito es identico: "firme estos datos con mi clave secreta; si la firma
coincide, confio en el contenido". No usamos JWT porque para 2 IDs en una cookie
seria overhead innecesario, pero la criptografia es la misma.

---

## Flujo completo

```
+---------------+     +----------------+     +-----------------+
|   Registro    |     |   Uso normal   |     |  Recuperacion   |
|  (onboarding) |     |   (/card/X)    |     |   (/recover)    |
+-------+-------+     +-------+--------+     +--------+--------+
        |                      |                       |
   PIN -> HMAC           localStorage?            tel + PIN
   + localStorage        +-- si -> OK            -> Server Action
   + cookie firmada      +-- no -> cookie?       -> verifica HMAC
        |                      +-- si -> restaura   -> cookie firmada
        v                      +-- no -> /recover   -> localStorage
    /card/X                                            |
                                                       v
                                                   /card/X
```

---

## Archivos relevantes

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/actions/customerSession.ts` | Server actions: hashPin, verifyPin, cookies |
| `app/(main)/recover/page.tsx` | UI de recuperacion (telefono + PIN) |
| `app/(main)/onboarding/page.tsx` | Registro con PIN obligatorio |
| `models/customer.model.ts` | Campo `pinHmac` en el modelo |
| `.env.local` | `ADMIN_HMAC_KEY` (clave secreta, nunca commitear) |

---

## Glosario rapido

- **HMAC**: Hash con clave secreta. Sin la clave no puedes reproducir el hash.
- **SHA-256**: Algoritmo de hash de 256 bits. Determinista (misma entrada = misma salida).
- **timingSafeEqual**: Comparacion en tiempo constante. Evita que un atacante deduzca
  caracteres correctos midiendo cuanto tarda la comparacion.
- **httpOnly cookie**: Cookie que el navegador envia automaticamente pero JavaScript
  no puede leer. Protege contra ataques XSS.
- **JWT (JSON Web Token)**: Estandar para tokens firmados. Mismo principio que nuestra
  cookie firmada pero con formato JSON y base64.
