import axios, { AxiosInstance } from "axios"

export class AuthService {
  protected readonly instance: AxiosInstance
  public constructor(url: string) {
    this.instance = axios.create({
      baseURL: url,
      timeout: 30000,
      timeoutErrorMessage: "Time out!",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    })
  }

  login = (
    username: string,
    password: string,
  ) => {
    return this.instance.post("/login", {
      username,
      password,
    })
  }

  saveTwoFactorToken = (secret: string, username: string, password: string) => {
    return this.instance.post("/setup_mfa", {
      secret,
      email: username,
      password,
    })
  }

  logout = () => {
    return this.instance.post("/logout")
  }

  me = () => {
    return this.instance.get("/me")
  }
}
