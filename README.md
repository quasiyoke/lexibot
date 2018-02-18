# WordsGuruBot

Telegram bot — your personal words' studying assistant.

## Running

Before running we should configure bot's secrets. The bot uses Docker Secrets' store.

Bot's token provided by [`@BotFather`](https://t.me/BotFather):

```sh
vi conf/bot_token
```

```
123456789:ABCDEFGHIJKLMNOPabcdefghijklmnop
```

```sh
vi conf/db_name
```

```
root
```

Docker Compose will provide us beautiful MongoDB URL:

```sh
vi conf/db_url
```

```
mongodb://db
```

```sh
vi conf/db_user
```

```
root
```

Just an example of secure DB password:

```sh
vi conf/db_password
```

```
g42*6{]FnDjgLY*j1|
```

And, finally, we will run Docker Compose:

```sh
docker-compose up -d
```
