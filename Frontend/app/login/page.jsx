'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [modo, setModo] = useState('entrar');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('modo') === 'registro') {
      setModo('registro');
    }
  }, []);

  const cambiarModo = (nuevoModo) => {
    setModo(nuevoModo);
    setAviso('');
    setClave('');
    setConfirmacion('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (modo === 'registro' && clave !== confirmacion) {
      setAviso('Las contraseñas no coinciden.');
      return;
    }

    setAviso('Prototipo de interfaz. No se enviaron ni guardaron tus datos.');
    setClave('');
    setConfirmacion('');
  };

  return (
    <div className="login-page">
      <Link className="login-brand" href="/usuarios">CompañIA</Link>

      <div className="login-content">
        <section className="login-panel" aria-labelledby="login-title">
          <header className="login-heading">
            <h1 id="login-title">{modo === 'entrar' ? 'Qué bueno verte' : 'Creá tu cuenta'}</h1>
            <p>{modo === 'entrar' ? 'Iniciá sesión para continuar con tu estudio.' : 'Prepará tu espacio para organizar el estudio.'}</p>
          </header>

          <div className="login-tabs" role="tablist" aria-label="Acceso a la cuenta">
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'entrar'}
              onClick={() => cambiarModo('entrar')}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'registro'}
              onClick={() => cambiarModo('registro')}
            >
              Crear cuenta
            </button>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {modo === 'registro' && (
              <label className="login-field" htmlFor="nombre">
                Nombre
                <input
                  id="nombre"
                  name="name"
                  autoComplete="name"
                  value={nombre}
                  onChange={(event) => setNombre(event.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </label>
            )}

            <label className="login-field" htmlFor="email">
              Correo electrónico
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vos@ejemplo.com"
                required
              />
            </label>

            <label className="login-field" htmlFor="clave">
              Contraseña
              <div className="login-password-row">
                <input
                  id="clave"
                  name="password"
                  type={mostrarClave ? 'text' : 'password'}
                  autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
                  value={clave}
                  onChange={(event) => setClave(event.target.value)}
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  required
                />
                <button type="button" onClick={() => setMostrarClave((visible) => !visible)}>
                  {mostrarClave ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </label>

            {modo === 'registro' ? (
              <label className="login-field" htmlFor="confirmacion">
                Repetir contraseña
                <input
                  id="confirmacion"
                  name="password-confirmation"
                  type={mostrarClave ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmacion}
                  onChange={(event) => setConfirmacion(event.target.value)}
                  minLength={8}
                  placeholder="Repetí tu contraseña"
                  required
                />
              </label>
            ) : (
              <button
                className="login-forgot-button"
                type="button"
                onClick={() => setAviso('La recuperación de contraseña se conectará con el backend.')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}

            <button className="login-submit" type="submit">
              {modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>

            {aviso && <p className="login-feedback" role="status">{aviso}</p>}
          </form>

          <p className="login-demo-note">
            Vista de demostración. No se envían ni se guardan datos; el acceso real lo conectará el equipo de backend.
          </p>
          <Link className="login-profile-link" href="/usuarios">
            Volver a los perfiles de prueba
          </Link>
        </section>
      </div>
    </div>
  );
}
